import { ComponentType } from '@angular/cdk/portal';
import { InteractivityChecker } from '@angular/cdk/a11y';
import {
  DestroyRef,
  EffectRef,
  Injectable,
  Injector,
  TemplateRef,
  effect,
  inject,
} from '@angular/core';
import { CkOverlayHandle, CkOverlayHost } from '@ckui/core/internal';
import { CK_DIALOG_DATA, CkDialogConfig } from './config';
import { CK_DIALOG_CONTEXT, CkDialogContext } from './dialog-context';
import { CK_DIALOG_SETUP, CkDialogContainer } from './dialog-container';
import { CkDialogRef } from './dialog-ref';

declare const ngDevMode: unknown;

const TABBABLE_CANDIDATES =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable], audio[controls], video[controls]';

interface ActiveDialog {
  close(): void;
  /** Settles the result promise and stops everything that outlives the overlay. */
  destroy(): void;
}

/**
 * Opens modal dialogs, which become bottom sheets on a phone. Takes a component or a template as
 * content and returns a `CkDialogRef` that closes it and delivers the result.
 */
@Injectable({ providedIn: 'root' })
export class CkDialog {
  private readonly overlay = inject(CkOverlayHost);
  private readonly checker = inject(InteractivityChecker);
  private readonly injector = inject(Injector);
  private readonly active = new Set<ActiveDialog>();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const dialog of [...this.active]) {
        dialog.destroy();
      }
      this.active.clear();
    });
  }

  /**
   * Opens a dialog. The content injects `CK_DIALOG_DATA` and `CkDialogRef`; a component sees the
   * app's providers, plus those of `config.injector` when given. On the server nothing is shown and
   * `closed` resolves with `undefined` at once.
   */
  open<C, D = unknown, R = unknown>(
    content: ComponentType<C> | TemplateRef<unknown>,
    config: CkDialogConfig<D> = {},
  ): CkDialogRef<R> {
    const dismissible = config.dismissible ?? true;
    const closeButton = config.closeButton ?? true;
    const context = new CkDialogContext();

    let resolveClosed: (result: R | undefined) => void = () => undefined;
    const closed = new Promise<R | undefined>((resolve) => (resolveClosed = resolve));
    let resolveClosing: () => void = () => undefined;
    const closing = new Promise<void>((resolve) => (resolveClosing = resolve));
    let handle: CkOverlayHandle | null = null;
    let requested = false;
    let result: R | undefined;
    let settled = false;
    let labelling: EffectRef | null = null;
    const dialog: ActiveDialog = { close: () => ref.close(), destroy: () => settle() };

    const settle = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolveClosing();
      labelling?.destroy();
      this.active.delete(dialog);
      resolveClosed(result);
    };

    const ref = new CkDialogRef<R>({
      closed,
      closing,
      close: (value) => {
        if (requested) {
          return;
        }
        requested = true;
        result = value;
        resolveClosing();
        // Closed from the content's constructor, before the overlay exists: it closes right after opening.
        void handle?.close();
      },
    });

    this.active.add(dialog);

    const dialogInjector = Injector.create({
      parent: config.injector ?? this.injector,
      providers: [
        { provide: CK_DIALOG_CONTEXT, useValue: context },
        { provide: CkDialogRef, useValue: ref },
        { provide: CK_DIALOG_DATA, useValue: config.data },
        {
          provide: CK_DIALOG_SETUP,
          useValue: { content, closeButton, dismissible },
        },
      ],
    });

    try {
      handle = this.overlay.open(
        CkDialogContainer,
        {
          mode: config.mode ?? 'auto',
          dismissible,
          fullHeight: config.fullHeight ?? false,
          role: config.role ?? 'dialog',
          ariaLabel: config.ariaLabel,
          panelClass: ['ck-dialog-panel', `ck-dialog-panel--${config.width ?? 'md'}`],
          onDismissRequest: () => ref.close(),
          initialFocus: () => (handle ? this.initialFocus(handle.panel) : null),
        },
        dialogInjector,
      );
    } catch (error) {
      settle();
      throw error;
    }

    const opened = handle;
    context.mode.set(opened.mode);
    labelling = effect(
      () => {
        this.setAttribute(opened.panel, 'aria-labelledby', context.titleId());
        this.setAttribute(opened.panel, 'aria-describedby', context.descriptionId());
      },
      { injector: this.injector },
    );
    void opened.closed.then(settle);
    if (requested) {
      void opened.close();
    }
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      void opened.opened.then(() => {
        if (!settled && context.titleId() === null && !config.ariaLabel) {
          console.warn(
            'CkDialog: the dialog has no accessible name. Add [ckDialogTitle] to a heading in its content or set `ariaLabel` in the config.',
          );
        }
      });
    }
    return ref;
  }

  /** Closes every open dialog as if each one's `close()` had been called without a result. */
  closeAll(): void {
    for (const dialog of [...this.active]) {
      dialog.close();
    }
  }

  private setAttribute(element: HTMLElement, name: string, value: string | null): void {
    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }

  /**
   * The marked element, else the first tabbable one of the content (the close button comes last in
   * the DOM, and the scrolling body itself is skipped), else the panel.
   */
  private initialFocus(panel: HTMLElement): HTMLElement {
    const marked = Array.from(
      panel.querySelectorAll<HTMLElement>('[data-ck-dialog-initial-focus]'),
    ).find((candidate) => this.checker.isFocusable(candidate));
    if (marked) {
      return marked;
    }
    const content = panel.querySelector<HTMLElement>('.ck-dialog__content');
    const first = Array.from(
      content?.querySelectorAll<HTMLElement>(TABBABLE_CANDIDATES) ?? [],
    ).find(
      (candidate) =>
        !candidate.classList.contains('ck-dialog-body') && this.checker.isTabbable(candidate),
    );
    return first ?? panel;
  }
}
