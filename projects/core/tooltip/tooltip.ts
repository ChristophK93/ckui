import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  Renderer2,
  afterRenderEffect,
  computed,
  inject,
  input,
  numberAttribute,
  booleanAttribute,
  signal,
  untracked,
} from '@angular/core';
import {
  AttributeClaim,
  CkAnchoredSide,
  anchoredPosition,
  collapseText,
  createCkId,
  hasAccessibleName,
  readAccessibleName,
  tokenPixels,
} from '@ckui/core/internal';
import { CkTooltipClient, CkTooltipLayer } from './tooltip-layer';

declare const ngDevMode: unknown;

/** Where the bubble sits. `start` and `end` follow the text direction of the host. */
export type CkTooltipPosition = CkAnchoredSide;

const SIDES: readonly CkTooltipPosition[] = ['above', 'below', 'start', 'end'];
/** The pointer has to stay this long on the host (touch: finger down) before the bubble shows. */
const LONG_PRESS = 500;
/** A finger that moves this far in pixels during the press is a scroll or a swipe, not a long-press. */
const MOVE_TOLERANCE = 10;
/** Time to cross from the host to the bubble (WCAG 1.4.13: hoverable). */
const HIDE_DELAY = 100;
/** A long-pressed bubble stays this long after the finger lifts. */
const TOUCH_HIDE_DELAY = 1500;
/** How long the click that follows a long-press stays suppressed if it never arrives. */
const CLICK_GUARD = 400;
const SELECTION_PROPERTIES = ['user-select', '-webkit-user-select', '-webkit-touch-callout'];

/**
 * Shows a short supplementary text next to a control: after a short delay on mouse hover, at once
 * on keyboard focus, and on a long-press on touch. The text describes the control
 * (`aria-describedby`); it never names it, so an icon-only button still needs an `aria-label`.
 *
 * The bubble is a native popover in the top layer, so it sits above dialogs, drawers and menus.
 * Escape hides it first and leaves the dialog around it open. Plain text only, and only on a
 * focusable element: a tooltip on a disabled button works with the mouse alone.
 */
@Directive({
  selector: '[ckTooltip]',
  exportAs: 'ckTooltip',
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'endPress()',
    '(pointercancel)': 'endPress()',
    '(lostpointercapture)': 'endPress()',
    '(contextmenu)': 'onContextMenu($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(keydown)': 'onKeydown()',
  },
})
export class CkTooltip {
  /** The text. Plain text only; empty, `null` or `undefined` shows nothing and wires nothing. */
  readonly text = input<string | null | undefined>(undefined, { alias: 'ckTooltip' });
  /** The preferred side. It flips to the opposite side without room. `start` and `end` follow `dir`. */
  readonly position = input<CkTooltipPosition>('above', { alias: 'ckTooltipPosition' });
  /** Milliseconds the pointer rests on the host before the bubble shows. Keyboard focus shows it at once. */
  readonly showDelay = input(500, {
    alias: 'ckTooltipShowDelay',
    transform: (value: unknown) => Math.max(0, numberAttribute(value, 500)),
  });
  /** Turns the tooltip off without removing the binding. An open one hides. */
  readonly disabled = input(false, { alias: 'ckTooltipDisabled', transform: booleanAttribute });

  private readonly visibleState = signal(false);
  /** Whether the bubble is showing. */
  readonly isVisible = this.visibleState.asReadonly();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);
  private readonly layer = inject(CkTooltipLayer);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly describedby = new AttributeClaim(
    this.element,
    'aria-describedby',
    this.renderer,
  );
  private readonly bubbleId = createCkId('ck-tooltip');
  private readonly label = computed(() => (this.text() ?? '').trim());
  /** Without the Popover API (Firefox before 125) the tooltip is off: nothing mounted, nothing wired. */
  private readonly supported =
    this.browser &&
    typeof this.element.ownerDocument.defaultView?.HTMLElement?.prototype.showPopover ===
      'function';
  private readonly enabled = computed(
    () => this.supported && !this.disabled() && this.label() !== '',
  );

  private bubble: HTMLElement | null = null;
  private attributeWatcher: MutationObserver | null = null;
  private visibility: IntersectionObserver | null = null;
  private resizeWatcher: ResizeObserver | null = null;
  /** What the shared layer sees of this tooltip; kept off the public class. */
  private readonly client: CkTooltipClient = {
    hide: () => this.hide(),
    // A tooltip that keyboard focus showed comes back after the one that took over hides.
    isRestorable: () => this.focusShown && this.visibleState(),
    restore: () => {
      if (this.enabled() && this.element.matches(':focus-visible')) {
        this.open(false, true);
      }
    },
  };
  private fromTouch = false;
  private focusShown = false;
  private pointerFocus = false;
  private margin = 8;
  private gap = 4;
  private warned = false;
  private destroyed = false;

  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private touchHideTimer: ReturnType<typeof setTimeout> | null = null;
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private guardTimer: ReturnType<typeof setTimeout> | null = null;
  private pressing = false;
  private pressPointer = -1;
  private pressX = 0;
  private pressY = 0;
  /** Set when a long-press showed the bubble; the click that ends that press must not reach the host. */
  private suppressClick = false;
  private savedStyles: { attribute: boolean; values: [string, string, string][] } | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    if (this.supported) {
      this.element.addEventListener('click', this.onClickCapture, true);
      this.element.addEventListener('auxclick', this.onClickCapture, true);
      afterRenderEffect(() => {
        this.label();
        this.enabled();
        this.position();
        untracked(() => this.sync());
      });
    }
    destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.hide();
      this.endPress();
      this.unmount();
      this.element.removeEventListener('click', this.onClickCapture, true);
      this.element.removeEventListener('auxclick', this.onClickCapture, true);
      this.clearTimer('guardTimer');
    });
  }

  /** Shows the tooltip now. Does nothing without text, while disabled or on the server. */
  show(): void {
    this.open(false);
  }

  /** Hides the tooltip now. */
  hide(): void {
    this.clearTimer('showTimer');
    this.clearTimer('hideTimer');
    this.clearTimer('touchHideTimer');
    if (!this.visibleState()) {
      return;
    }
    this.visibleState.set(false);
    this.focusShown = false;
    this.detachWhileShown();
    const bubble = this.bubble;
    if (bubble?.matches(':popover-open')) {
      bubble.hidePopover();
    }
    this.layer.release(this.client);
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch' || !this.enabled()) {
      return;
    }
    this.clearTimer('hideTimer');
    if (this.visibleState() || this.showTimer !== null) {
      return;
    }
    const delay = this.layer.warm ? 0 : this.showDelay();
    if (delay <= 0) {
      this.open(false);
    } else {
      this.showTimer = setTimeout(() => {
        this.showTimer = null;
        this.open(false);
      }, delay);
    }
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.clearTimer('showTimer');
    if (!this.focusShown) {
      this.scheduleHide();
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    this.dropClickGuard();
    // A text input matches :focus-visible on every focus; this press's focus is not a keyboard one.
    this.pointerFocus = true;
    if (event.pointerType === 'touch') {
      this.beginPress(event);
      return;
    }
    this.hide();
  }

  protected onPointerMove(event: PointerEvent): void {
    if (
      this.pressTimer !== null &&
      event.pointerId === this.pressPointer &&
      Math.hypot(event.clientX - this.pressX, event.clientY - this.pressY) >= MOVE_TOLERANCE
    ) {
      this.endPress();
    }
  }

  /** The native callout that a long-press opens on a touch screen would sit on top of the bubble. */
  protected onContextMenu(event: Event): void {
    if (this.pressing || this.suppressClick) {
      event.preventDefault();
    }
  }

  protected onFocus(): void {
    const byPointer = this.pointerFocus;
    this.pointerFocus = false;
    if (!byPointer && this.enabled() && this.element.matches(':focus-visible')) {
      this.open(false, true);
    }
  }

  protected onBlur(): void {
    this.pointerFocus = false;
    this.layer.forget(this.client);
    this.endPress();
    this.hide();
  }

  protected onKeydown(): void {
    this.pointerFocus = false;
    this.dropClickGuard();
  }

  protected dropClickGuard(): void {
    this.suppressClick = false;
    this.clearTimer('guardTimer');
  }

  /**
   * Ends a touch press: on release, `pointercancel`, `lostpointercapture`, blur and the document
   * turning hidden. A bubble that a long-press showed hides a moment later.
   */
  protected endPress(): void {
    this.clearTimer('pressTimer');
    if (!this.pressing) {
      return;
    }
    this.pressing = false;
    this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.restoreSelection();
    if (this.suppressClick) {
      this.clearTimer('guardTimer');
      this.guardTimer = setTimeout(() => {
        this.guardTimer = null;
        this.suppressClick = false;
      }, CLICK_GUARD);
    }
    if (this.visibleState() && this.fromTouch && !this.destroyed) {
      this.clearTimer('touchHideTimer');
      this.touchHideTimer = setTimeout(() => {
        this.touchHideTimer = null;
        this.hide();
      }, TOUCH_HIDE_DELAY);
    }
  }

  private beginPress(event: PointerEvent): void {
    this.endPress();
    this.clearTimer('touchHideTimer');
    if (!event.isPrimary || !this.enabled() || this.element.matches(':disabled')) {
      return;
    }
    this.pressing = true;
    this.pressPointer = event.pointerId;
    this.pressX = event.clientX;
    this.pressY = event.clientY;
    this.suppressSelection();
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.pressTimer = setTimeout(() => {
      this.pressTimer = null;
      if (this.pressing && !this.destroyed) {
        this.suppressClick = true;
        this.open(true);
      }
    }, LONG_PRESS);
  }

  private readonly onVisibilityChange = (): void => {
    if (this.document.visibilityState === 'hidden') {
      this.endPress();
    }
  };

  private readonly onClickCapture = (event: Event): void => {
    if (this.suppressClick) {
      this.dropClickGuard();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  /** The text selection and the callout of a long-press, off for as long as the finger is down. */
  private suppressSelection(): void {
    const style = this.element.style;
    this.savedStyles = {
      attribute: this.element.hasAttribute('style'),
      values: SELECTION_PROPERTIES.map((name) => [
        name,
        style.getPropertyValue(name),
        style.getPropertyPriority(name),
      ]),
    };
    for (const name of SELECTION_PROPERTIES) {
      style.setProperty(name, 'none');
    }
  }

  private restoreSelection(): void {
    const saved = this.savedStyles;
    this.savedStyles = null;
    if (saved === null) {
      return;
    }
    const style = this.element.style;
    for (const [name, value, priority] of saved.values) {
      style.setProperty(name, value, priority);
    }
    if (!saved.attribute && this.element.getAttribute('style') === '') {
      this.element.removeAttribute('style');
    }
  }

  private scheduleHide(): void {
    this.clearTimer('hideTimer');
    if (this.visibleState() && !this.fromTouch) {
      this.hideTimer = setTimeout(() => {
        this.hideTimer = null;
        this.hide();
      }, HIDE_DELAY);
    }
  }

  private readonly onBubbleEnter = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') {
      this.clearTimer('hideTimer');
    }
  };

  private readonly onBubbleLeave = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') {
      this.scheduleHide();
    }
  };

  private open(fromTouch: boolean, byFocus = false): void {
    this.clearTimer('showTimer');
    this.clearTimer('hideTimer');
    this.clearTimer('touchHideTimer');
    if (!this.browser || this.destroyed) {
      return;
    }
    this.sync();
    const bubble = this.bubble;
    if (bubble === null || !this.enabled()) {
      return;
    }
    if (this.visibleState()) {
      this.place();
      return;
    }
    // Nothing is shown for a host behind a modal: it is inert, and so is whatever it describes.
    if (this.element.closest('[inert]') !== null) {
      return;
    }
    const layerElement = this.layer.element();
    if (bubble.parentNode !== layerElement) {
      layerElement.append(bubble);
    }
    this.margin = tokenPixels(layerElement, '--ck-space-2', 8);
    this.gap = tokenPixels(layerElement, '--ck-space-1', 4);
    this.fromTouch = fromTouch;
    this.focusShown = byFocus;
    const view = this.document.defaultView;
    bubble.dir = view?.getComputedStyle(this.element).direction === 'rtl' ? 'rtl' : 'ltr';
    try {
      bubble.showPopover();
    } catch {
      // Not in a document that can show it: stay off rather than claim the layer.
      return;
    }
    this.layer.claim(this.client);
    this.visibleState.set(true);
    this.place();
    this.attachWhileShown();
  }

  /** Brings the bubble, its text, its placement and the host's `aria-describedby` in line with the inputs. */
  private sync(): void {
    if (!this.browser || this.destroyed) {
      return;
    }
    if (!this.enabled()) {
      this.hide();
      this.unmount();
      return;
    }
    const text = this.label();
    const bubble = this.mount();
    if (bubble.textContent !== text) {
      bubble.textContent = text;
    }
    const sameAsName =
      collapseText(readAccessibleName(this.element)).toLowerCase() ===
      collapseText(text).toLowerCase();
    this.describedby.applyToken(sameAsName ? null : this.bubbleId);
    if (
      typeof ngDevMode !== 'undefined' &&
      ngDevMode &&
      !this.warned &&
      !hasAccessibleName(this.element, { title: true, text: true, labels: true })
    ) {
      this.warned = true;
      console.warn(
        '[ckui] ckTooltip describes a control, it never names it, and this one has no accessible name. Add an aria-label, aria-labelledby or visible text.',
        this.element,
      );
    }
    if (this.visibleState()) {
      this.place();
    }
  }

  /**
   * The bubble stays in the layer, hidden, for as long as the tooltip is enabled, so the host's
   * `aria-describedby` always points at something: a screen reader that reaches the control without
   * keyboard focus (virtual cursor, touch exploration) still reads the description.
   */
  private mount(): HTMLElement {
    if (this.bubble === null) {
      const bubble = this.document.createElement('div');
      bubble.id = this.bubbleId;
      bubble.className = 'ck-tooltip';
      bubble.setAttribute('role', 'tooltip');
      bubble.setAttribute('popover', 'manual');
      bubble.addEventListener('pointerenter', this.onBubbleEnter);
      bubble.addEventListener('pointerleave', this.onBubbleLeave);
      this.layer.element().append(bubble);
      this.bubble = bubble;
      const view = this.document.defaultView;
      if (view !== null && typeof view.MutationObserver === 'function') {
        // A consumer binding that rewrites these attributes would drop our id or change the name.
        this.attributeWatcher = new view.MutationObserver(() => this.sync());
        this.attributeWatcher.observe(this.element, {
          attributes: true,
          attributeFilter: ['aria-describedby', 'aria-label', 'aria-labelledby', 'title'],
        });
      }
    }
    return this.bubble;
  }

  private unmount(): void {
    this.attributeWatcher?.disconnect();
    this.attributeWatcher = null;
    this.describedby.applyToken(null);
    this.layer.forget(this.client);
    const bubble = this.bubble;
    this.bubble = null;
    if (bubble !== null) {
      bubble.removeEventListener('pointerenter', this.onBubbleEnter);
      bubble.removeEventListener('pointerleave', this.onBubbleLeave);
      bubble.remove();
    }
  }

  private place(): void {
    const bubble = this.bubble;
    if (bubble === null || !this.visibleState()) {
      return;
    }
    const side = SIDES.includes(this.position()) ? this.position() : 'above';
    const placement = anchoredPosition(this.element, bubble, side, this.margin, this.gap);
    bubble.style.translate = `${placement.x}px ${placement.y}px`;
    for (const name of SIDES) {
      bubble.classList.toggle(`ck-tooltip--${name}`, name === placement.side);
    }
  }

  private readonly onViewportChange = (): void => this.place();

  /** A press anywhere ends a bubble that a long-press showed. */
  private readonly onDocumentPointerDown = (): void => this.hide();

  private attachWhileShown(): void {
    const view = this.document.defaultView;
    this.document.addEventListener('scroll', this.onViewportChange, {
      capture: true,
      passive: true,
    });
    view?.addEventListener('resize', this.onViewportChange);
    view?.visualViewport?.addEventListener('resize', this.onViewportChange);
    view?.visualViewport?.addEventListener('scroll', this.onViewportChange);
    if (this.fromTouch) {
      this.document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    }
    // The host or the bubble changing size (a font loading, a text change) moves the bubble.
    if (view !== null && typeof view.ResizeObserver === 'function' && this.bubble !== null) {
      this.resizeWatcher = new view.ResizeObserver(() => this.place());
      this.resizeWatcher.observe(this.element);
      this.resizeWatcher.observe(this.bubble);
    }
    this.placeAfterAnimations();
    // Scrolled out of view (also inside a scroll container) takes the tooltip along.
    if (view !== null && typeof view.IntersectionObserver === 'function') {
      this.visibility = new view.IntersectionObserver((records) => {
        if (records.at(-1)?.isIntersecting === false) {
          this.hide();
        }
      });
      this.visibility.observe(this.element);
    }
  }

  /** A host inside an overlay that is still scaling in sits elsewhere once the entry animation is over. */
  private placeAfterAnimations(): void {
    const running = (this.document.getAnimations?.() ?? []).filter((animation) => {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      return (
        target instanceof Element &&
        target.contains(this.element) &&
        animation.effect?.getComputedTiming().iterations !== Infinity
      );
    });
    if (running.length === 0) {
      return;
    }
    void Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
      if (!this.destroyed && this.visibleState()) {
        this.place();
      }
    });
  }

  private detachWhileShown(): void {
    const view = this.document.defaultView;
    this.document.removeEventListener('scroll', this.onViewportChange, true);
    this.document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    view?.removeEventListener('resize', this.onViewportChange);
    view?.visualViewport?.removeEventListener('resize', this.onViewportChange);
    view?.visualViewport?.removeEventListener('scroll', this.onViewportChange);
    this.visibility?.disconnect();
    this.visibility = null;
    this.resizeWatcher?.disconnect();
    this.resizeWatcher = null;
    this.fromTouch = false;
  }

  private clearTimer(
    name: 'showTimer' | 'hideTimer' | 'touchHideTimer' | 'pressTimer' | 'guardTimer',
  ): void {
    const timer = this[name];
    if (timer !== null) {
      clearTimeout(timer);
      this[name] = null;
    }
  }
}
