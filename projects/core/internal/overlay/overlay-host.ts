import { Overlay, OverlayContainer, OverlayRef, ScrollStrategy } from '@angular/cdk/overlay';
import { ComponentPortal, ComponentType, Portal, TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, Injector, PLATFORM_ID, TemplateRef, inject } from '@angular/core';
import { CkFocusTrap, CkFocusTrapFactory, CkInert, CkMedia } from '@ckui/core/internal';
import { CkOverlayPane } from './overlay-pane';
import { attachSheetSwipe } from './sheet-swipe';

export type CkOverlayMode = 'auto' | 'modal' | 'sheet' | 'side';
export type CkOverlayDismissReason = 'escape' | 'backdrop' | 'swipe';

export interface CkOverlayConfig {
  /**
   * `auto` becomes a sheet when `CkMedia.sheet()` is true at the moment of opening, else a modal;
   * it never becomes `side`. Default `auto`.
   */
  mode?: CkOverlayMode;
  /** The edge a `side` panel sits on; `end` is the right edge in a left-to-right page. Resolved when opening. Default `end`. */
  side?: 'start' | 'end';
  /** Escape and a click on the backdrop, and for a sheet a swipe down, may close the overlay. Default `true`. */
  dismissible?: boolean;
  /** A sheet as tall as the viewport allows instead of as tall as its content. */
  fullHeight?: boolean;
  panelClass?: string | string[];
  /** Default `dialog`. */
  role?: 'dialog' | 'alertdialog';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  /**
   * Called when the user asks to dismiss (Escape, backdrop, swipe) a dismissible overlay. It is
   * expected to call `handle.close()` straight away; without it the host closes the overlay itself.
   * A sheet that is still open after a swipe snaps back.
   */
  onDismissRequest?: (reason: CkOverlayDismissReason) => void;
  /**
   * Picks the element that takes focus once the overlay has rendered. Without it, or when it
   * returns `null` or something that cannot take focus, the first tabbable element does.
   */
  initialFocus?: () => HTMLElement | null;
}

export interface CkOverlayHandle {
  /** The mode resolved when the overlay opened. */
  readonly mode: 'modal' | 'sheet' | 'side';
  /** The element that carries `role`, `aria-modal` and the labels; set `aria-labelledby` here when the title appears later. */
  readonly panel: HTMLElement;
  /** Resolves once the opening animation and the initial focus are done. */
  readonly opened: Promise<void>;
  /** Resolves once the overlay is detached. */
  readonly closed: Promise<void>;
  /** Animates out, then detaches. Repeated calls return the same promise. */
  close(): Promise<void>;
}

const DEFAULT_DURATION = 200;
const SHEET_MAX_HEIGHT = 'calc(100dvh - env(safe-area-inset-top, 0px))';
const MODAL_MARGIN = 'var(--ck-space-4, 1rem)';
const SIDE_HEIGHT = '100dvh';

type State = 'open' | 'closing' | 'closed';

interface Entry {
  readonly overlayRef: OverlayRef;
  readonly dismissible: boolean;
  readonly dismiss: (reason: CkOverlayDismissReason) => void;
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

/**
 * Opens modal dialogs, bottom sheets and side panels on the CDK overlay: backdrop, scroll lock, focus trap and
 * restore, `inert` background, Escape / backdrop / swipe dismissal and the open and close animation.
 */
@Injectable({ providedIn: 'root' })
export class CkOverlayHost {
  private readonly overlay = inject(Overlay);
  private readonly overlayContainer = inject(OverlayContainer);
  private readonly media = inject(CkMedia);
  private readonly inert = inject(CkInert);
  private readonly focusTraps = inject(CkFocusTrapFactory);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Open overlays, topmost last. A closing overlay has already left it. */
  private readonly stack: Entry[] = [];
  private readonly entries = new Set<Entry>();
  private scrollStrategy: ScrollStrategy | null = null;
  private scrollLocks = 0;
  private listening = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const entry of [...this.entries]) {
        entry.destroy();
      }
      this.entries.clear();
      this.stack.length = 0;
      this.listen(false);
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
    const mode: 'modal' | 'sheet' | 'side' =
      requested === 'auto' ? (this.media.sheet() ? 'sheet' : 'modal') : requested;
    if (!this.isBrowser) {
      return this.inertHandle(mode);
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
          : `calc(100dvh - 2 * ${MODAL_MARGIN})`,
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

    let paneRef;
    try {
      paneRef = overlayRef.attach(new ComponentPortal(CkOverlayPane, null, this.injector));
      paneRef.setInput('grab', sheet && dismissible);
      paneRef.changeDetectorRef.detectChanges();
      paneRef.instance.attach(this.contentPortal(content, paneRef.instance, injector));
    } catch (error) {
      overlayRef.dispose();
      throw error;
    }

    panel.setAttribute('role', config.role ?? 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.tabIndex = -1;
    for (const [attribute, value] of [
      ['aria-label', config.ariaLabel],
      ['aria-labelledby', config.ariaLabelledBy],
      ['aria-describedby', config.ariaDescribedBy],
    ] as const) {
      if (value) {
        panel.setAttribute(attribute, value);
      }
    }

    const backdrop = this.document.createElement('div');
    backdrop.className = 'ck-overlay-backdrop';
    host.prepend(backdrop);

    // The opener is recorded before the background turns inert; inert would blur it.
    const opener =
      this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    const trap: CkFocusTrap = this.focusTraps.create(panel);
    const activation = trap.activate(config.initialFocus);

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

    const motion = () => {
      const style = view!.getComputedStyle(panel);
      return {
        duration: this.media.reducedMotion()
          ? 0
          : parseDuration(style.getPropertyValue('--ck-duration-normal')),
        easing: style.getPropertyValue('--ck-ease-standard').trim() || 'ease',
      };
    };

    const play = (
      element: HTMLElement,
      keyframes: Keyframe[],
      fill: FillMode,
    ): Animation | null => {
      const { duration, easing } = motion();
      if (duration <= 0 || typeof element.animate !== 'function') {
        return null;
      }
      return element.animate(keyframes, { duration, easing, fill });
    };

    const finished = (animation: Animation | null): Promise<unknown> =>
      animation ? animation.finished.catch(() => undefined) : Promise.resolve();

    const entry: Entry = {
      overlayRef,
      dismissible,
      state: 'open',
      openers: opener ? [opener] : [],
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
      closing = Promise.all(animations.map(finished)).then(finish);
      return closing;
    };

    return { mode, panel, opened, closed, close };
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
  private inertHandle(mode: 'modal' | 'sheet' | 'side'): CkOverlayHandle {
    return {
      mode,
      panel: this.document.createElement('div'),
      opened: Promise.resolve(),
      closed: Promise.resolve(),
      close: () => Promise.resolve(),
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
    } else {
      this.document.removeEventListener('keydown', this.onKeydown);
    }
  }

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
