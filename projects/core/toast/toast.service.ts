import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ApplicationRef,
  ComponentRef,
  DestroyRef,
  EnvironmentInjector,
  Injectable,
  PLATFORM_ID,
  createComponent,
  inject,
} from '@angular/core';
import { CkToastHost } from './toast-host';
import { CkToastOptions, CkToastRef } from './toast-ref';
import { CkToastStore, ToastEntry } from './toast-store';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shows short messages in a stack at the edge of the screen. Announces each one to screen readers,
 * stays open for an action or a danger message, and pauses while the user reads it.
 */
@Injectable({ providedIn: 'root' })
export class CkToast {
  private readonly store = inject(CkToastStore);
  private readonly document = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private host: ComponentRef<CkToastHost> | null = null;
  private hostElement: HTMLElement | null = null;
  /** The element that had focus before it entered the toast host, where it goes back to. */
  private focusOrigin: HTMLElement | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.store.teardown();
      this.hostElement?.removeEventListener('focusin', this.onFocusIn);
      this.focusOrigin = null;
      this.host?.destroy();
      this.hostElement?.remove();
      this.host = null;
      this.hostElement = null;
    });
  }

  /**
   * Shows a toast and returns the ref that controls it. A blank message with no title shows
   * nothing. On the server nothing is shown and `dismissed` resolves as `programmatic` at once.
   */
  show(options: CkToastOptions): CkToastRef {
    const ref = this.store.show(options);
    if (this.isBrowser && this.store.entries().length > 0) {
      this.ensureHost();
    }
    return ref;
  }

  /** Closes every toast, queued ones included, with the reason `programmatic`. */
  dismissAll(): void {
    this.store.dismissAll();
  }

  private ensureHost(): void {
    if (this.host) {
      return;
    }
    const element = this.document.createElement('section');
    this.document.body.appendChild(element);
    this.hostElement = element;
    element.addEventListener('focusin', this.onFocusIn);
    this.store.beforeLeave = (entry) => this.moveFocusAway(entry);
    this.host = createComponent(CkToastHost, {
      environmentInjector: this.environmentInjector,
      hostElement: element,
    });
    this.appRef.attachView(this.host.hostView);
    this.host.changeDetectorRef.detectChanges();
  }

  private readonly onFocusIn = (event: FocusEvent): void => {
    const origin = event.relatedTarget;
    if (origin instanceof HTMLElement && !this.hostElement?.contains(origin)) {
      this.focusOrigin = origin;
    }
  };

  /**
   * A toast that holds focus is about to leave: focus goes to the same button of the next toast
   * (else the previous one), else back to where it came from, else into the open modal overlay.
   * Without any of these focus is left alone.
   */
  private moveFocusAway(entry: ToastEntry): void {
    const host = this.hostElement;
    const active = this.document.activeElement;
    if (!host || !entry.element || !active || !entry.element.contains(active)) {
      return;
    }
    const slot = active.closest('.ck-toast__action') ? 'action' : 'dismiss';
    const items = Array.from(host.querySelectorAll<HTMLElement>('ck-toast-item'));
    const index = items.indexOf(entry.element);
    const stays = (item: HTMLElement): boolean =>
      item !== entry.element &&
      this.store.entries().some((other) => other.element === item && other.phase() === 'visible');
    const neighbours = [
      ...items.slice(index + 1).filter(stays),
      ...items.slice(0, index).filter(stays).reverse(),
    ];
    for (const item of neighbours) {
      const target =
        item.querySelector<HTMLElement>(`.ck-toast__${slot}`) ??
        item.querySelector<HTMLElement>('.ck-toast__dismiss');
      if (this.tryFocus(target)) {
        return;
      }
    }
    const origin = this.focusOrigin;
    if (origin?.isConnected && !host.contains(origin) && this.tryFocus(origin)) {
      return;
    }
    const modals = this.document.querySelectorAll<HTMLElement>('[aria-modal="true"]');
    const modal = modals[modals.length - 1];
    if (modal) {
      if (!this.tryFocus(modal.querySelector<HTMLElement>(FOCUSABLE))) {
        this.tryFocus(modal);
      }
    }
  }

  private tryFocus(element: HTMLElement | null | undefined): boolean {
    element?.focus({ preventScroll: true });
    return !!element && this.document.activeElement === element;
  }
}
