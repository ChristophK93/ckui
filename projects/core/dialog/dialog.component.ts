import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  TemplateRef,
  ViewEncapsulation,
  afterRenderEffect,
  booleanAttribute,
  contentChild,
  inject,
  input,
  model,
  output,
  untracked,
} from '@angular/core';
import { CkDialogRef } from '@ckui/core/internal/dialog';
import { CkDialogMode, CkDialogRole, CkDialogWidth } from './config';
import { CkDialog } from './dialog.service';

declare const ngDevMode: unknown;

/**
 * A dialog declared in a template. Its content is one `<ng-template>` that is only rendered while
 * `open` is true, so nothing in it exists while the dialog is closed. `[(open)]` follows the dialog:
 * Escape, the backdrop, the close button and `[ckDialogClose]` set it back to `false`.
 */
@Component({
  selector: 'ck-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: none' },
  template: ``,
})
export class CkDialogComponent {
  readonly open = model(false);
  readonly role = input<CkDialogRole>('dialog');
  readonly width = input<CkDialogWidth>('md');
  readonly dismissible = input(true, { transform: booleanAttribute });
  readonly closeButton = input(true, { transform: booleanAttribute });
  readonly mode = input<CkDialogMode>('auto');
  readonly fullHeight = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Emits when the dialog has left the screen, with the result of `[ckDialogClose]`, else `undefined`. */
  readonly closed = output<unknown>();

  private readonly template = contentChild(TemplateRef);
  private readonly dialog = inject(CkDialog);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private ref: CkDialogRef | null = null;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.ref?.close();
      this.ref = null;
    });
    // After render: never on the server, and never while a template is being checked.
    afterRenderEffect(() => {
      const wanted = this.open();
      if (!this.isBrowser) {
        return;
      }
      untracked(() => this.sync(wanted));
    });
  }

  private sync(wanted: boolean): void {
    if (wanted && !this.ref) {
      this.show();
    } else if (!wanted && this.ref) {
      const ref = this.ref;
      this.ref = null;
      ref.close();
    }
  }

  private show(): void {
    const template = this.template();
    if (!template) {
      if (typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.warn('ck-dialog: put the content in an <ng-template> inside the element.');
      }
      this.open.set(false);
      return;
    }
    const ref = this.dialog.open(template, {
      role: this.role(),
      width: this.width(),
      dismissible: this.dismissible(),
      closeButton: this.closeButton(),
      mode: this.mode(),
      fullHeight: this.fullHeight(),
      ariaLabel: this.ariaLabel(),
    });
    this.ref = ref;
    // `open` follows the moment the close starts, so the opener can reopen during the leave animation.
    void ref.closing.then(() => {
      if (!this.destroyed && this.ref === ref) {
        this.ref = null;
        this.open.set(false);
      }
    });
    void ref.closed.then((result) => {
      if (!this.destroyed) {
        this.closed.emit(result);
      }
    });
  }
}
