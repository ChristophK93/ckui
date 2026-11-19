import { ComponentType } from '@angular/cdk/portal';
import { Injectable, TemplateRef, inject } from '@angular/core';
import { CkMedia } from '@ckui/core/internal';
import { CkDialogOpener } from '@ckui/core/internal/dialog';
import { CkDrawerConfig } from './config';
import { CkDrawerRef } from './drawer-ref';

/**
 * Opens drawers: a full-height panel that slides in from the side, or a bottom sheet on a phone.
 * Takes a component or a template as content and returns a `CkDrawerRef` (the dialog's ref) that
 * closes it and delivers the result.
 */
@Injectable({ providedIn: 'root' })
export class CkDrawer {
  private readonly opener = new CkDialogOpener();
  private readonly media = inject(CkMedia);

  /**
   * Opens a drawer. The content injects `CK_DRAWER_DATA` and `CkDrawerRef`; a component sees the
   * app's providers, plus those of `config.injector` when given. On the server nothing is shown and
   * `closed` resolves with `undefined` at once.
   */
  open<C, D = unknown, R = unknown>(
    content: ComponentType<C> | TemplateRef<unknown>,
    config: CkDrawerConfig<D> = {},
  ): CkDrawerRef<R> {
    const requested = config.mode ?? 'auto';
    const mode = requested === 'auto' ? (this.media.sheet() ? 'sheet' : 'side') : requested;
    return this.opener.open<C, D, R>(content, {
      kind: 'CkDrawer',
      mode,
      side: config.side ?? 'end',
      data: config.data,
      role: config.role ?? 'dialog',
      dismissible: config.dismissible ?? true,
      closeButton: config.closeButton ?? true,
      fullHeight: config.fullHeight ?? false,
      injector: config.injector,
      ariaLabel: config.ariaLabel,
      panelClass: ['ck-drawer-panel', `ck-drawer-panel--${config.width ?? 'md'}`],
    });
  }

  /** Closes every open drawer as if each one's `close()` had been called without a result. */
  closeAll(): void {
    this.opener.closeAll();
  }
}
