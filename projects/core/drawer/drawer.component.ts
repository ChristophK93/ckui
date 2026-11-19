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
import { CkDialogRole } from '@ckui/core/dialog';
import { CkDrawerMode, CkDrawerSide, CkDrawerWidth } from './config';
import { CkDrawerRef } from './drawer-ref';
import { CkDrawer } from './drawer.service';

declare const ngDevMode: unknown;

/**
 * A drawer declared in a template. Its content is one `<ng-template>` that is only rendered while
 * `open` is true, so nothing in it exists while the drawer is closed. `[(open)]` follows the drawer:
 * Escape, the backdrop, the close button and `[ckDialogClose]` set it back to `false`.
 */
@Component({
  selector: 'ck-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: none' },
  template: ``,
})
export class CkDrawerComponent {
  readonly open = model(false);
  readonly side = input<CkDrawerSide>('end');
  readonly mode = input<CkDrawerMode>('auto');
  readonly role = input<CkDialogRole>('dialog');
  readonly width = input<CkDrawerWidth>('md');
  readonly dismissible = input(true, { transform: booleanAttribute });
  readonly closeButton = input(true, { transform: booleanAttribute });
  readonly fullHeight = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Emits when the drawer has left the screen, with the result of `[ckDialogClose]`, else `undefined`. */
  readonly closed = output<unknown>();

  private readonly template = contentChild(TemplateRef);
  private readonly drawer = inject(CkDrawer);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private ref: CkDrawerRef | null = null;
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
        console.warn('ck-drawer: put the content in an <ng-template> inside the element.');
      }
      this.open.set(false);
      return;
    }
    const ref = this.drawer.open(template, {
      side: this.side(),
      mode: this.mode(),
      role: this.role(),
      width: this.width(),
      dismissible: this.dismissible(),
      closeButton: this.closeButton(),
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
