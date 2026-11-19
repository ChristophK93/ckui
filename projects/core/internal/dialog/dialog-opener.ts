import { InteractivityChecker } from '@angular/cdk/a11y';
import { ComponentType } from '@angular/cdk/portal';
import {
  DestroyRef,
  EffectRef,
  InjectionToken,
  Injector,
  TemplateRef,
  effect,
  inject,
} from '@angular/core';
import { CkOverlayHandle, CkOverlayHost, CkOverlayMode } from '@ckui/core/internal/overlay';
import { CK_DIALOG_CONTEXT, CkDialogContext } from './dialog-context';
import { CK_DIALOG_SETUP, CkDialogContainer } from './dialog-container';
import { CkDialogRef } from './dialog-ref';

declare const ngDevMode: unknown;

/** The `data` of the config, for a dialog or drawer opened with a component. */
export const CK_DIALOG_DATA = new InjectionToken<unknown>('CK_DIALOG_DATA');

const TABBABLE_CANDIDATES =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable], audio[controls], video[controls]';

export interface CkDialogOpenOptions<D> {
  /** Names the opener in dev warnings. */
  readonly kind: 'CkDialog' | 'CkDrawer';
  readonly mode: Exclude<CkOverlayMode, 'popover'>;
  readonly side?: 'start' | 'end';
  readonly data?: D;
  readonly role: 'dialog' | 'alertdialog';
  readonly dismissible: boolean;
  readonly closeButton: boolean;
  readonly fullHeight: boolean;
  readonly injector?: Injector;
  readonly ariaLabel?: string;
  readonly panelClass: string[];
}

interface ActiveDialog {
  close(): void;
  /** Settles the result promise and stops everything that outlives the overlay. */
  destroy(): void;
}

/**
 * What dialog and drawer share: the ref, the result promise, the labelling from the building
 * blocks, the initial focus and the teardown. One instance per service, created in its field
 * initialiser (an injection context).
 */
export class CkDialogOpener {
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

  open<C, D, R>(
    content: ComponentType<C> | TemplateRef<unknown>,
    options: CkDialogOpenOptions<D>,
  ): CkDialogRef<R> {
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
      parent: options.injector ?? this.injector,
      providers: [
        { provide: CK_DIALOG_CONTEXT, useValue: context },
        { provide: CkDialogRef, useValue: ref },
        { provide: CK_DIALOG_DATA, useValue: options.data },
        {
          provide: CK_DIALOG_SETUP,
          useValue: {
            content,
            closeButton: options.closeButton,
            dismissible: options.dismissible,
          },
        },
      ],
    });

    try {
      handle = this.overlay.open(
        CkDialogContainer,
        {
          mode: options.mode,
          side: options.side,
          dismissible: options.dismissible,
          fullHeight: options.fullHeight,
          role: options.role,
          ariaLabel: options.ariaLabel,
          panelClass: options.panelClass,
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
    context.mode.set(opened.mode === 'popover' ? 'modal' : opened.mode);
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
        if (!settled && context.titleId() === null && !options.ariaLabel) {
          console.warn(
            `${options.kind}: the ${options.kind === 'CkDrawer' ? 'drawer' : 'dialog'} has no accessible name. Add [ckDialogTitle] to a heading in its content or set \`ariaLabel\` in the config.`,
          );
        }
      });
    }
    return ref;
  }

  /** Closes every open one as if each `close()` had been called without a result. */
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
