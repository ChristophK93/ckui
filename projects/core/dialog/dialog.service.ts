import { ComponentType } from '@angular/cdk/portal';
import { Injectable, TemplateRef } from '@angular/core';
import { CkDialogOpener, CkDialogRef } from '@ckui/core/internal/dialog';
import { CkDialogConfig } from './config';

/**
 * Opens modal dialogs, which become bottom sheets on a phone. Takes a component or a template as
 * content and returns a `CkDialogRef` that closes it and delivers the result.
 */
@Injectable({ providedIn: 'root' })
export class CkDialog {
  private readonly opener = new CkDialogOpener();

  /**
   * Opens a dialog. The content injects `CK_DIALOG_DATA` and `CkDialogRef`; a component sees the
   * app's providers, plus those of `config.injector` when given. On the server nothing is shown and
   * `closed` resolves with `undefined` at once.
   */
  open<C, D = unknown, R = unknown>(
    content: ComponentType<C> | TemplateRef<unknown>,
    config: CkDialogConfig<D> = {},
  ): CkDialogRef<R> {
    return this.opener.open<C, D, R>(content, {
      kind: 'CkDialog',
      mode: config.mode ?? 'auto',
      data: config.data,
      role: config.role ?? 'dialog',
      dismissible: config.dismissible ?? true,
      closeButton: config.closeButton ?? true,
      fullHeight: config.fullHeight ?? false,
      injector: config.injector,
      ariaLabel: config.ariaLabel,
      panelClass: ['ck-dialog-panel', `ck-dialog-panel--${config.width ?? 'md'}`],
    });
  }

  /** Closes every open dialog as if each one's `close()` had been called without a result. */
  closeAll(): void {
    this.opener.closeAll();
  }
}
