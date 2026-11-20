import { InteractivityChecker } from '@angular/cdk/a11y';
import { Overlay, OverlayContainer, OverlayRef, ScrollStrategy } from '@angular/cdk/overlay';
import { ComponentPortal, ComponentType, Portal, TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  Injector,
  PLATFORM_ID,
  PendingTasks,
  TemplateRef,
  afterNextRender,
  inject,
} from '@angular/core';
import {
  CkFocusTrap,
  CkFocusTrapFactory,
  CkInert,
  CkMedia,
  tokenPixels,
} from '@ckui/core/internal';
import { CkOverlayPane } from './overlay-pane';
import { popoverPosition } from './popover-position';
import { attachSheetSwipe } from './sheet-swipe';
import { VIEWPORT_HEIGHT, createViewportFollower } from './visual-viewport';

export type CkOverlayMode = 'auto' | 'modal' | 'sheet' | 'side' | 'popover';
export type CkOverlayDismissReason =
  'escape' | 'backdrop' | 'swipe' | 'outside' | 'focusout' | 'detached';

type ResolvedMode = Exclude<CkOverlayMode, 'auto'>;

export interface CkOverlayConfig {
  /**
   * `auto` becomes a sheet when `CkMedia.sheet()` is true at the moment of opening, else what
   * `desktop` says; it never becomes `side`. `popover` is anchored to `anchor` and not modal: no
   * backdrop, no `inert`, no scroll lock, no focus trap. Default `auto`.
   */
  mode?: CkOverlayMode;
  /** What `auto` becomes when it is not a sheet. Default `modal`. */
  desktop?: 'modal' | 'popover';
  /** The element a `popover` opens under. Required for `popover` (an error in development). */
  anchor?: HTMLElement;
  /** A popover is at least as wide as its anchor was when it opened (and when it repositions). */
  matchAnchorWidth?: boolean;
  /**
   * Moves focus into the overlay once it has rendered (`initialFocus`, else the first tabbable
   * element). `false` leaves focus where it is, for a popover whose anchor keeps focus
   * (`aria-activedescendant`). A modal or sheet with `false` still wraps Tab but does not move focus
   * itself, so the caller has to. Default `true`.
   */
  autoFocus?: boolean;
  /** The edge a `side` panel sits on; `end` is the right edge in a left-to-right page. Resolved when opening. Default `end`. */
  side?: 'start' | 'end';
  /**
   * Escape and a click on the backdrop, and for a sheet a swipe down, may close the overlay; a
   * popover also closes on a press or focus outside it and its anchor, and when the anchor leaves
   * view. Default `true`.
   */
  dismissible?: boolean;
  /** A sheet as tall as the viewport allows instead of as tall as its content. */
  fullHeight?: boolean;
  panelClass?: string | string[];
  /**
   * `none` puts no `role` and no `aria-modal` on the panel (the content carries the role). A
   * popover never sets `aria-modal`. Default `dialog`, for a popover `none`.
   */
  role?: 'dialog' | 'alertdialog' | 'none';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  /**
   * Called when the user asks to dismiss (Escape, backdrop, swipe, outside, focusout, detached) a dismissible overlay. It is
   * expected to call `handle.close()` straight away; without it the host closes the overlay itself.
   * A sheet that is still open after a swipe snaps back.
   */
  onDismissRequest?: (reason: CkOverlayDismissReason) => void;
  /**
   * Picks the element that takes focus once the overlay has rendered. Without it, or when it
   * returns `null` or something that cannot take focus, the first tabbable element does.
   */
  initialFocus?: () => HTMLElement | null;
  /**
   * Keeps the content alive until the task that closed the overlay has ended, also when nothing
   * animates (reduced motion). Without it an event handler of the content that is still waiting
   * for its turn (a `(click)` registered after the one that closed it) would find its view
   * destroyed. Everything else of a close, focus and `inert` included, still happens at once.
   */
  keepUntilTaskEnds?: boolean;
}

export interface CkOverlayHandle {
  /** The mode resolved when the overlay opened. */
  readonly mode: 'modal' | 'sheet' | 'side' | 'popover';
  /** The element that carries `role`, `aria-modal` and the labels; set `aria-labelledby` here when the title appears later. */
  readonly panel: HTMLElement;
  /** Resolves once the opening animation and the initial focus are done. */
  readonly opened: Promise<void>;
  /** Resolves once the overlay is detached. */
  readonly closed: Promise<void>;
  /** Animates out, then detaches. Repeated calls return the same promise. */
  close(): Promise<void>;
  /** Places a popover again after its content or its anchor changed size. Does nothing for other modes. */
  reposition(): void;
}

const DEFAULT_DURATION = 200;
const SHEET_MAX_HEIGHT = `calc(${VIEWPORT_HEIGHT} - env(safe-area-inset-top, 0px))`;
const MODAL_MARGIN = 'var(--ck-space-4, 1rem)';
const SIDE_HEIGHT = VIEWPORT_HEIGHT;

type State = 'open' | 'closing' | 'closed';

interface Entry {
  readonly overlayRef: OverlayRef;
  readonly dismissible: boolean;
  readonly dismiss: (reason: CkOverlayDismissReason) => void;
  /** Popovers only: whether an event path went through the panel or the anchor. */
  readonly contains?: (path: EventTarget[]) => boolean;
  readonly close: () => Promise<void>;
  /** Elements that had focus before this overlay (and ones it inherited) that focus can return to. */
  readonly openers: HTMLElement[];
  /** Runs the whole teardown at once, without animation. Safe to call repeatedly. */
  readonly destroy: () => void;
  state: State;
}

function parseDuration(value: string): number {
  const match = /^\s*(-?[\d.]+)(ms|s)\s*$/.exec(value);
  if (!match) {
    return DEFAULT_DURATION;
  }
  const amount = Number(match[1]) * (match[2] === 's' ? 1000 : 1);
  return Number.isFinite(amount) && amount >= 0 ? amount : DEFAULT_DURATION;
}

function createMotion(media: CkMedia, view: Window, panel: HTMLElement) {
  const motion = () => {
    const style = view.getComputedStyle(panel);
    return {
      duration: media.reducedMotion()
        ? 0
        : parseDuration(style.getPropertyValue('--ck-duration-normal')),
      easing: style.getPropertyValue('--ck-ease-standard').trim() || 'ease',
    };
  };

  const play = (element: HTMLElement, keyframes: Keyframe[], fill: FillMode): Animation | null => {
    const { duration, easing } = motion();
    if (duration <= 0 || typeof element.animate !== 'function') {
      return null;
    }
    return element.animate(keyframes, { duration, easing, fill });
  };

  const finished = (animation: Animation | null): Promise<unknown> =>
    animation ? animation.finished.catch(() => undefined) : Promise.resolve();

  return { motion, play, finished };
}

function describePanel(panel: HTMLElement, config: CkOverlayConfig, role: string): void {
  if (role !== 'none') {
    panel.setAttribute('role', role);
  }
  for (const [attribute, value] of [
    ['aria-label', config.ariaLabel],
    ['aria-labelledby', config.ariaLabelledBy],
    ['aria-describedby', config.ariaDescribedBy],
  ] as const) {
    if (value) {
      panel.setAttribute(attribute, value);
    }
  }
}

/**
 * Opens modal dialogs, bottom sheets and side panels on the CDK overlay: backdrop, scroll lock, focus trap and
 * restore, `inert` background, Escape / backdrop / swipe dismissal and the open and close animation;
 * and anchored, non-modal popovers that stack on top of any of them.
 */
@Injectable({ providedIn: 'root' })
export class CkOverlayHost {
  private readonly overlay = inject(Overlay);
  private readonly overlayContainer = inject(OverlayContainer);
  private readonly media = inject(CkMedia);
  private readonly inert = inject(CkInert);
  private readonly focusTraps = inject(CkFocusTrapFactory);
  private readonly interactivity = inject(InteractivityChecker);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly pendingTasks = inject(PendingTasks);
  private readonly viewport = createViewportFollower(this.document.defaultView);

  /** Open overlays, topmost last. A closing overlay has already left it. */
  private readonly stack: Entry[] = [];
  private readonly entries = new Set<Entry>();
  private scrollStrategy: ScrollStrategy | null = null;
  private scrollLocks = 0;
  private listening = false;
  /** An outside press just closed a popover: the click that follows must not also close a backdrop. */
  private swallowBackdropClick = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const entry of [...this.entries]) {
        entry.destroy();
      }
      this.entries.clear();
      this.stack.length = 0;
      this.listen(false);
      this.viewport.destroy();
      if (this.scrollLocks > 0) {
        this.scrollLocks = 0;
        this.scrollStrategy?.disable();
      }
    });
  }

  open<C>(
    content: ComponentType<C> | TemplateRef<unknown>,
    config: CkOverlayConfig = {},
    injector?: Injector,
  ): CkOverlayHandle {
    const requested = config.mode ?? 'auto';
    let mode: ResolvedMode =
      requested === 'auto'
        ? this.media.sheet()
          ? 'sheet'
          : (config.desktop ?? 'modal')
        : requested;
    if (mode === 'popover' && !config.anchor) {
      if (typeof ngDevMode !== 'undefined' && ngDevMode) {
        throw new Error('CkOverlayHost: mode "popover" needs an anchor element.');
      }
      mode = 'modal';
    }
    if (!this.isBrowser) {
      return this.inertHandle(mode);
    }
    if (mode === 'popover') {
      return this.openPopover(content, config, injector, config.anchor!);
    }

    const sheet = mode === 'sheet';
    const side = mode === 'side';
    const dismissible = config.dismissible ?? true;
    const container = this.overlayContainer.getContainerElement();
    container.style.zIndex = 'var(--ck-z-overlay, 1000)';
    const view = this.document.defaultView;
    // The physical edge is resolved now, from the written direction of the page.
    const rtl = view?.getComputedStyle(container).direction === 'rtl';
    const onRight = (config.side ?? 'end') === 'end' ? !rtl : rtl;

    const overlayRef = this.overlay.create({
      // Content direction follows the same reading as the edge, not the CDK's startup snapshot.
      direction: rtl ? 'rtl' : 'ltr',
      positionStrategy: side
        ? this.sidePosition(onRight)
        : sheet
          ? this.overlay.position().global().bottom('0').centerHorizontally()
          : this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      width: sheet ? '100%' : undefined,
      height: side ? SIDE_HEIGHT : sheet && config.fullHeight ? SHEET_MAX_HEIGHT : undefined,
      maxWidth: sheet
        ? undefined
        : side
          ? `calc(100% - ${MODAL_MARGIN})`
          : `calc(100% - 2 * ${MODAL_MARGIN})`,
      maxHeight: side
        ? SIDE_HEIGHT
        : sheet
          ? SHEET_MAX_HEIGHT
          : `calc(${VIEWPORT_HEIGHT} - 2 * ${MODAL_MARGIN})`,
      panelClass: [
        'ck-overlay',
        `ck-overlay--${mode}`,
        ...(side ? [`ck-overlay--${onRight ? 'right' : 'left'}`] : []),
        ...(config.panelClass === undefined ? [] : [config.panelClass].flat()),
      ],
      disposeOnNavigation: false,
      // The top layer would put every overlay above the toast host; the z-index tokens order them instead.
      usePopover: false,
    });
    const panel = overlayRef.overlayElement;
    const host = overlayRef.hostElement;

    const paneRef = this.attachPane(overlayRef, content, injector, sheet && dismissible);

    const role = config.role ?? 'dialog';
    if (role !== 'none') {
      panel.setAttribute('aria-modal', 'true');
    }
    panel.tabIndex = -1;
    describePanel(panel, config, role);

    const backdrop = this.document.createElement('div');
    backdrop.className = 'ck-overlay-backdrop';
    host.prepend(backdrop);
    const unfollowViewport = this.viewport.follow(host);

    // The opener is recorded before the background turns inert; inert would blur it.
    const opener =
      this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    const trap: CkFocusTrap = this.focusTraps.create(panel);
    const activation = trap.activate(config.initialFocus, config.autoFocus ?? true);

    const releaseInert = this.inert.hold([
      ...this.inert.backgroundElements(container),
      ...this.stack.map((other) => other.overlayRef.hostElement),
    ]);
    this.lockScroll();

    let resolveClosed: () => void = () => undefined;
    const closed = new Promise<void>((resolve) => (resolveClosed = resolve));
    let closing: Promise<void> | null = null;
    let released = false;
    let finishedOnce = false;
    let openAnimations: Animation[] = [];

    const { motion, play, finished } = createMotion(this.media, view!, panel);

    const entry: Entry = {
      overlayRef,
      dismissible,
      state: 'open',
      openers: opener ? [opener] : [],
      close: () => close(),
      dismiss: (reason) => {
        if (config.onDismissRequest) {
          config.onDismissRequest(reason);
        } else {
          void close();
        }
      },
      destroy: () => {
        release();
        finish();
      },
    };
    this.entries.add(entry);
    this.stack.push(entry);
    this.listen(true);

    const detachSwipe =
      sheet && dismissible
        ? attachSheetSwipe({
            pane: paneRef.location.nativeElement as HTMLElement,
            panel,
            backdrop,
            duration: () => motion().duration,
            easing: () => motion().easing,
            onRelease: (dismissed) => {
              if (dismissed) {
                entry.dismiss('swipe');
              }
              return entry.state !== 'open';
            },
          })
        : () => undefined;

    const onBackdropClick = (): void => {
      if (this.swallowBackdropClick) {
        this.swallowBackdropClick = false;
        return;
      }
      if (entry.state === 'open' && dismissible && this.stack.at(-1) === entry) {
        entry.dismiss('backdrop');
      }
    };
    backdrop.addEventListener('click', onBackdropClick);

    /** Everything that must stop the moment the overlay starts closing. */
    const release = (): void => {
      if (released) {
        return;
      }
      released = true;
      // A popover above this overlay would be left floating over nothing.
      this.closePopoversAbove(entry);
      entry.state = 'closing';
      const index = this.stack.indexOf(entry);
      this.stack.splice(index, 1);
      // An overlay above this one gets its openers, so focus can still reach the page later.
      this.stack[index]?.openers.unshift(...entry.openers);
      detachSwipe();
      backdrop.removeEventListener('click', onBackdropClick);
      for (const animation of openAnimations) {
        animation.cancel();
      }
      // The background has to be live again before the opener can take focus back.
      releaseInert();
      host.inert = true;
      trap.release();
      this.restoreFocus(entry);
    };

    /** Everything that happens once the overlay is gone. */
    const finish = (): void => {
      if (finishedOnce) {
        return;
      }
      finishedOnce = true;
      entry.state = 'closed';
      this.entries.delete(entry);
      overlayRef.dispose();
      backdrop.remove();
      unfollowViewport();
      this.unlockScroll();
      if (this.entries.size === 0) {
        this.listen(false);
      }
      resolveClosed();
    };

    // Out of the screen towards the edge the panel sits on.
    const offscreen = side ? `translateX(${onRight ? '' : '-'}100%)` : 'translateY(100%)';
    const enter: Keyframe[] =
      sheet || side
        ? [{ transform: offscreen }, { transform: 'none' }]
        : [
            { opacity: 0, transform: 'scale(0.96)' },
            { opacity: 1, transform: 'none' },
          ];
    openAnimations = [
      play(panel, enter, 'none'),
      play(backdrop, [{ opacity: 0 }, { opacity: 1 }], 'none'),
    ].filter((animation): animation is Animation => animation !== null);

    // Nothing focusable inside: the panel takes focus right away, not after the animation.
    void activation.then((focused) => {
      if (entry.state === 'open' && !focused) {
        panel.focus({ preventScroll: true });
      }
    });
    const opened = Promise.all([
      activation,
      ...openAnimations.map((animation) => finished(animation)),
    ]).then(() => undefined);

    const close = (): Promise<void> => {
      if (closing) {
        return closing;
      }
      release();
      const leave: Keyframe[] =
        sheet || side ? [{ transform: offscreen }] : [{ opacity: 0, transform: 'scale(0.96)' }];
      const animations = [
        play(panel, leave, 'forwards'),
        play(backdrop, [{ opacity: 0 }], 'forwards'),
      ];
      closing = Promise.all([...animations.map(finished), this.taskEnd(config)]).then(finish);
      return closing;
    };

    return { mode, panel, opened, closed, close, reposition: () => undefined };
  }

  /** Resolves at once, or with `keepUntilTaskEnds` after the current task; the app counts as unstable until then. */
  private taskEnd(config: CkOverlayConfig): Promise<void> {
    if (!config.keepUntilTaskEnds) {
      return Promise.resolve();
    }
    const done = this.pendingTasks.add();
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        done();
        resolve();
      }),
    );
  }

  private attachPane<C>(
    overlayRef: OverlayRef,
    content: ComponentType<C> | TemplateRef<unknown>,
    injector: Injector | undefined,
    grab: boolean,
  ) {
    try {
      const paneRef = overlayRef.attach(new ComponentPortal(CkOverlayPane, null, this.injector));
      paneRef.setInput('grab', grab);
      paneRef.changeDetectorRef.detectChanges();
      paneRef.instance.attach(this.contentPortal(content, paneRef.instance, injector));
      return paneRef;
    } catch (error) {
      overlayRef.dispose();
      throw error;
    }
  }

  private closePopoversAbove(entry: Entry): void {
    const index = this.stack.indexOf(entry);
    if (index < 0) {
      return;
    }
    for (const above of this.stack.slice(index + 1)) {
      if (above.contains) {
        void above.close();
      }
    }
  }

  /** Anchored, non-modal: no backdrop, `inert`, scroll lock or focus trap, and it stacks above any other overlay. */
  private openPopover<C>(
    content: ComponentType<C> | TemplateRef<unknown>,
    config: CkOverlayConfig,
    injector: Injector | undefined,
    anchor: HTMLElement,
  ): CkOverlayHandle {
    const dismissible = config.dismissible ?? true;
    const autoFocus = config.autoFocus ?? true;
    const container = this.overlayContainer.getContainerElement();
    container.style.zIndex = 'var(--ck-z-overlay, 1000)';
    const view = this.document.defaultView!;
    const rtl = view.getComputedStyle(anchor).direction === 'rtl';
    const margin = tokenPixels(container, '--ck-space-2', 8);
    // An anchor that spans the viewport would push a panel as wide as it past the viewport margin.
    const matchWidth = (): number | undefined =>
      config.matchAnchorWidth
        ? Math.min(anchor.offsetWidth, this.document.documentElement.clientWidth - 2 * margin)
        : undefined;

    const overlayRef = this.overlay.create({
      direction: rtl ? 'rtl' : 'ltr',
      positionStrategy: popoverPosition(
        this.overlay,
        anchor,
        tokenPixels(container, '--ck-space-1', 4),
        margin,
      ),
      // The strategy only shrinks a panel into a side that has at least this much room. The style
      // that comes with it is cleared again below: a short panel stays short.
      minHeight: tokenPixels(container, '--ck-target-min', 24) * 3,
      maxHeight: `calc(100dvh - 2 * ${margin}px)`,
      // Scrolling is followed by the capture listener below: it also sees nested scroll containers.
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      minWidth: matchWidth(),
      panelClass: [
        'ck-overlay',
        'ck-overlay--popover',
        ...(config.panelClass === undefined ? [] : [config.panelClass].flat()),
      ],
      disposeOnNavigation: false,
      usePopover: false,
    });
    const panel = overlayRef.overlayElement;
    const host = overlayRef.hostElement;
    const paneRef = this.attachPane(overlayRef, content, injector, false);
    const paneElement = paneRef.location.nativeElement as HTMLElement;

    describePanel(panel, config, config.role ?? 'none');
    panel.style.minHeight = '';
    // A panel that can take focus would steal it from an anchor that keeps it when the pane is clicked.
    if (autoFocus) {
      panel.tabIndex = -1;
    }
    const opener =
      this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;

    let resolveClosed: () => void = () => undefined;
    const closed = new Promise<void>((resolve) => (resolveClosed = resolve));
    let resolveFocus: () => void = () => undefined;
    const focused = new Promise<void>((resolve) => (resolveFocus = resolve));
    let closing: Promise<void> | null = null;
    let released = false;
    let finishedOnce = false;
    let openAnimations: Animation[] = [];
    const { play, finished } = createMotion(this.media, view, panel);

    const entry: Entry = {
      overlayRef,
      dismissible,
      state: 'open',
      openers: [],
      contains: (path) => path.includes(panel) || path.includes(anchor),
      close: () => close(),
      dismiss: (reason) => {
        if (config.onDismissRequest) {
          config.onDismissRequest(reason);
        } else {
          void close();
        }
      },
      destroy: () => {
        release();
        finish();
      },
    };

    const reposition = (): void => {
      if (entry.state !== 'open' || !overlayRef.hasAttached()) {
        return;
      }
      const minWidth = matchWidth();
      if (minWidth !== undefined) {
        overlayRef.updateSize({ minWidth });
        panel.style.minHeight = '';
      }
      overlayRef.updatePosition();
    };
    const onScroll = (event: Event): void => {
      if (!(event.target instanceof Node && panel.contains(event.target))) {
        reposition();
      }
    };
    const scrollOptions = { capture: true, passive: true } as const;
    this.document.addEventListener('scroll', onScroll, scrollOptions);
    view.addEventListener('resize', reposition);
    // Fully out of view (scrolled out of any container, hidden, or removed) is no place for a popover.
    const visibility =
      typeof view.IntersectionObserver === 'function'
        ? new view.IntersectionObserver((records) => {
            if (records.at(-1)?.isIntersecting === false && entry.state === 'open' && dismissible) {
              entry.dismiss('detached');
            }
          })
        : null;
    visibility?.observe(anchor);

    this.entries.add(entry);
    this.stack.push(entry);
    this.listen(true);
    overlayRef.updatePosition();

    const release = (): void => {
      if (released) {
        return;
      }
      released = true;
      this.closePopoversAbove(entry);
      entry.state = 'closing';
      this.stack.splice(this.stack.indexOf(entry), 1);
      this.document.removeEventListener('scroll', onScroll, scrollOptions);
      view.removeEventListener('resize', reposition);
      visibility?.disconnect();
      for (const animation of openAnimations) {
        animation.cancel();
      }
      resolveFocus();
      this.restorePopoverFocus(panel, anchor, opener);
      host.inert = true;
    };

    const finish = (): void => {
      if (finishedOnce) {
        return;
      }
      finishedOnce = true;
      entry.state = 'closed';
      this.entries.delete(entry);
      overlayRef.dispose();
      if (this.entries.size === 0) {
        this.listen(false);
      }
      resolveClosed();
    };

    const below = panel.getBoundingClientRect().top >= anchor.getBoundingClientRect().bottom - 1;
    const shift = `translateY(${below ? '-' : ''}0.25rem) scale(0.98)`;
    const origin = below ? 'top' : 'bottom';
    openAnimations = [
      play(
        paneElement,
        [
          { opacity: 0, transform: shift, transformOrigin: origin },
          { opacity: 1, transform: 'none', transformOrigin: origin },
        ],
        'none',
      ),
    ].filter((animation): animation is Animation => animation !== null);

    // The content may size itself after the first render: place the popover once more then.
    afterNextRender(
      () => {
        if (entry.state !== 'open') {
          return;
        }
        try {
          reposition();
          if (autoFocus) {
            this.focusInside(panel, config.initialFocus);
          }
        } finally {
          resolveFocus();
        }
      },
      { injector: this.injector },
    );
    const opened = Promise.all([
      focused,
      ...openAnimations.map((animation) => finished(animation)),
    ]).then(() => undefined);

    const close = (): Promise<void> => {
      if (closing) {
        return closing;
      }
      release();
      const leave = play(
        paneElement,
        [{ opacity: 0, transform: shift, transformOrigin: origin }],
        'forwards',
      );
      closing = Promise.all([finished(leave), this.taskEnd(config)]).then(finish);
      return closing;
    };

    return { mode: 'popover', panel, opened, closed, close, reposition };
  }

  /** First focus of a popover: `initialFocus`, else the first tabbable element, else the panel. */
  private focusInside(panel: HTMLElement, initialFocus?: () => HTMLElement | null): void {
    const options = { preventScroll: true };
    const preferred = initialFocus?.() ?? null;
    if (preferred) {
      preferred.focus(options);
      if (this.document.activeElement === preferred) {
        return;
      }
    }
    const first = Array.from(panel.querySelectorAll<HTMLElement>('*')).find(
      (element) => this.interactivity.isTabbable(element) && this.interactivity.isVisible(element),
    );
    first?.focus(options);
    if (!panel.contains(this.document.activeElement)) {
      panel.focus(options);
    }
  }

  /** Focus inside the closing panel goes to the anchor; focus the user already moved elsewhere stays. */
  private restorePopoverFocus(
    panel: HTMLElement,
    anchor: HTMLElement,
    opener: HTMLElement | null,
  ): void {
    if (!panel.contains(this.document.activeElement)) {
      return;
    }
    for (const candidate of [anchor, opener]) {
      if (candidate?.isConnected) {
        candidate.focus({ preventScroll: true });
        if (this.document.activeElement === candidate) {
          return;
        }
      }
    }
    this.stack.at(-1)?.overlayRef.overlayElement.focus({ preventScroll: true });
  }

  /** Focus did not return to where it came from (opener disabled, inert or gone): find it a home. */
  private restoreFocus(closed: Entry): void {
    const top = this.stack.at(-1);
    const active = this.document.activeElement;
    if (top?.overlayRef.overlayElement.contains(active)) {
      return;
    }
    const openers = [...closed.openers].reverse().filter((candidate) => candidate.isConnected);
    if (active && openers.includes(active as HTMLElement)) {
      return;
    }
    for (const candidate of openers) {
      candidate.focus();
      if (this.document.activeElement === candidate) {
        return;
      }
    }
    top?.overlayRef.overlayElement.focus({ preventScroll: true });
  }

  /** Full height, flush against the physical left or right edge. */
  private sidePosition(right: boolean) {
    const position = this.overlay.position().global().top('0');
    return right ? position.right('0') : position.left('0');
  }

  private contentPortal<C>(
    content: ComponentType<C> | TemplateRef<unknown>,
    pane: CkOverlayPane,
    injector: Injector | undefined,
  ): Portal<unknown> {
    return content instanceof TemplateRef
      ? new TemplatePortal(content, pane.viewContainerRef, undefined, injector)
      : new ComponentPortal(content, null, injector ?? this.injector);
  }

  /** What the server gets: nothing is rendered, and the overlay counts as closed. */
  private inertHandle(mode: ResolvedMode): CkOverlayHandle {
    return {
      mode,
      panel: this.document.createElement('div'),
      opened: Promise.resolve(),
      closed: Promise.resolve(),
      close: () => Promise.resolve(),
      reposition: () => undefined,
    };
  }

  private lockScroll(): void {
    this.scrollStrategy ??= this.overlay.scrollStrategies.block();
    if (this.scrollLocks++ === 0) {
      this.scrollStrategy.enable();
    }
  }

  private unlockScroll(): void {
    if (this.scrollLocks > 0 && --this.scrollLocks === 0) {
      this.scrollStrategy?.disable();
    }
  }

  private listen(active: boolean): void {
    if (active === this.listening) {
      return;
    }
    this.listening = active;
    if (active) {
      this.document.addEventListener('keydown', this.onKeydown);
      this.document.addEventListener('pointerdown', this.onPointerdown, true);
      this.document.addEventListener('focusin', this.onFocusin, true);
    } else {
      this.document.removeEventListener('keydown', this.onKeydown);
      this.document.removeEventListener('pointerdown', this.onPointerdown, true);
      this.document.removeEventListener('focusin', this.onFocusin, true);
    }
  }

  /** The topmost overlay, if it is an open, dismissible popover. */
  private topPopover(): Entry | null {
    const top = this.stack.at(-1);
    return top?.contains && top.state === 'open' && top.dismissible ? top : null;
  }

  /** A press in a layer marked `data-ck-outside-ignore` (the tooltip layer) never dismisses a popover. */
  private isIgnoredPress(path: EventTarget[]): boolean {
    return path.some(
      (node) => node instanceof Element && node.hasAttribute('data-ck-outside-ignore'),
    );
  }

  private readonly onPointerdown = (event: PointerEvent): void => {
    this.swallowBackdropClick = false;
    const popover = this.topPopover();
    const path = event.composedPath();
    if (popover && !popover.contains!(path) && !this.isIgnoredPress(path)) {
      this.swallowBackdropClick = true;
      popover.dismiss('outside');
    }
  };

  private readonly onFocusin = (event: FocusEvent): void => {
    const target = event.target;
    // Focus that fell to the page itself is a click on plain content; the press already handled it.
    if (
      !target ||
      target === this.document ||
      target === this.document.body ||
      target === this.document.documentElement
    ) {
      return;
    }
    const popover = this.topPopover();
    const path = event.composedPath();
    if (popover && !popover.contains!(path) && !this.isIgnoredPress(path)) {
      popover.dismiss('focusout');
    }
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
      return;
    }
    const top = this.stack.at(-1);
    if (top?.dismissible) {
      event.preventDefault();
      top.dismiss('escape');
    }
  };
}
