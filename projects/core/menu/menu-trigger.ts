import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  PLATFORM_ID,
  Renderer2,
  TemplateRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AttributeClaim,
  CkMedia,
  createCkId,
  hasAccessibleName,
  readAccessibleName,
} from '@ckui/core/internal';
import { CkOverlayHandle, CkOverlayHost } from '@ckui/core/internal/overlay';
import { CK_MENU_SESSION, CkMenuSession } from './menu-context';
import { CkMenuPanel } from './menu-panel';

declare const ngDevMode: unknown;

/**
 * Turns a native `<button>` into a menu button (development builds warn about any other element): it opens the template it is given, a `ck-menu`,
 * under itself (a bottom sheet with a Cancel row on a phone). Click, Enter and Space open it with
 * the first item focused, Arrow Down the same, Arrow Up with the last one; another click closes
 * it. It works together with `ckButton` on the same element and keeps the attributes you set.
 *
 * Give an icon-only button an `aria-label`: it names the menu and titles the sheet.
 */
@Directive({
  selector: '[ckMenuTrigger]',
  exportAs: 'ckMenuTrigger',
  host: {
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class CkMenuTrigger {
  /** The template that holds the `ck-menu`, usually an `<ng-template #name>` next to the button. */
  readonly template = input.required<TemplateRef<unknown> | null | undefined>({
    alias: 'ckMenuTrigger',
  });

  /** Emits when the menu opened. */
  readonly menuOpened = output<void>();
  /** Emits when the menu closed, however it was closed. */
  readonly menuClosed = output<void>();

  private readonly stateOpen = signal(false);
  /** Whether the menu is open. */
  readonly isOpen = this.stateOpen.asReadonly();

  private readonly element = inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly overlay = inject(CkOverlayHost);
  private readonly media = inject(CkMedia);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly claims = new Map<string, AttributeClaim>();
  private readonly session = signal<CkMenuSession | null>(null);
  private readonly expanded = computed(() => (this.stateOpen() ? 'true' : 'false'));
  private handle: CkOverlayHandle | null = null;
  /** The id this directive gave the button; a consumer's own id is never touched. */
  private ownId: string | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      this.override('aria-haspopup', 'menu');
      this.override('aria-expanded', this.expanded());
      const menuId = this.session()?.menuId() ?? null;
      this.override('aria-controls', this.stateOpen() ? menuId : null);
    });

    destroyRef.onDestroy(() => {
      const handle = this.handle;
      this.handle = null;
      this.releaseId();
      void handle?.close();
    });

    if (typeof ngDevMode !== 'undefined' && ngDevMode && this.browser) {
      let destroyed = false;
      destroyRef.onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (destroyed) {
          return;
        }
        if (this.element.tagName !== 'BUTTON') {
          console.warn(
            '[ckui] ckMenuTrigger belongs on a native <button>: the keys and the attributes assume one.',
            this.element,
          );
        }
        if (!hasAccessibleName(this.element, { title: true, text: true })) {
          console.warn(
            '[ckui] ckMenuTrigger has no accessible name. Add an aria-label, aria-labelledby or visible text; it also names the menu.',
            this.element,
          );
        }
      });
    }
  }

  /** Opens the menu with its first (or, with `last`, its last) item focused. Does nothing while open. */
  open(edge: 'first' | 'last' = 'first'): void {
    const template = this.template();
    if (!this.browser || this.stateOpen() || !template || this.element.matches(':disabled')) {
      return;
    }
    const sheet = this.media.sheet();
    const session: CkMenuSession = {
      template,
      sheet,
      name: readAccessibleName(this.element),
      triggerId: this.ensureId(),
      menuId: signal<string | null>(null),
      edge,
      menu: null,
      close: () => this.close(),
      activated: () => this.activated(),
    };
    this.session.set(session);
    this.stateOpen.set(true);
    const handle = this.overlay.open(
      CkMenuPanel,
      {
        mode: 'auto',
        desktop: 'popover',
        anchor: this.element,
        autoFocus: true,
        role: sheet ? 'dialog' : 'none',
        ariaLabel: sheet && session.name !== '' ? session.name : undefined,
        dismissible: true,
        panelClass: 'ck-menu-overlay',
        keepUntilTaskEnds: true,
        initialFocus: () => session.menu?.focusTarget(edge) ?? null,
        onDismissRequest: () => this.close(),
      },
      Injector.create({
        parent: this.injector,
        providers: [{ provide: CK_MENU_SESSION, useValue: session }],
      }),
    );
    this.handle = handle;
    this.menuOpened.emit();
    void handle.closed.then(() => {
      if (this.handle === handle) {
        this.handle = null;
        this.finishClose();
      }
    });
  }

  /** Closes the menu. Focus goes back to the button when it was inside the menu. */
  close(): void {
    const handle = this.handle;
    if (handle === null) {
      return;
    }
    this.handle = null;
    this.finishClose();
    void handle.close();
  }

  private finishClose(): void {
    this.stateOpen.set(false);
    this.session.set(null);
    this.releaseId();
    this.menuClosed.emit();
  }

  /** An item was pressed: close now, so the consumer's handler runs with the menu gone. */
  private activated(): void {
    this.close();
    const active = this.document.activeElement;
    if (active === null || active === this.document.body) {
      this.element.focus({ preventScroll: true });
    }
  }

  protected onClick(): void {
    if (this.stateOpen()) {
      this.close();
    } else {
      this.open('first');
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
    ) {
      return;
    }
    event.preventDefault();
    const edge = event.key === 'ArrowDown' ? 'first' : 'last';
    if (this.stateOpen()) {
      this.session()?.menu?.focusTarget(edge)?.focus();
    } else {
      this.open(edge);
    }
  }

  /** The id the menu points `aria-labelledby` at: the button's own, or one made for as long as the menu is open. */
  private ensureId(): string {
    if (this.element.id !== '' && this.element.id !== this.ownId) {
      return this.element.id;
    }
    this.ownId ??= createCkId('ck-menu-trigger');
    this.renderer.setAttribute(this.element, 'id', this.ownId);
    return this.ownId;
  }

  private releaseId(): void {
    if (this.ownId !== null && this.element.id === this.ownId) {
      this.renderer.removeAttribute(this.element, 'id');
    }
    this.ownId = null;
  }

  /** Sets the attribute, or gives the consumer's own value back when `value` is null. */
  private override(name: string, value: string | null): void {
    let claim = this.claims.get(name);
    if (claim === undefined) {
      claim = new AttributeClaim(this.element, name, this.renderer);
      this.claims.set(name, claim);
    }
    claim.apply(value);
  }
}
