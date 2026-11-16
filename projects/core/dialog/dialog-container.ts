import { CdkPortalOutlet, ComponentPortal, Portal, TemplatePortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  EmbeddedViewRef,
  InjectionToken,
  Injector,
  TemplateRef,
  ViewContainerRef,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { ComponentType } from '@angular/cdk/portal';
import { CK_LABELS } from '@ckui/core';
import { CkButton } from '@ckui/core/button';
import { CkIcon } from '@ckui/core/internal';
import { CK_DIALOG_CONTEXT } from './dialog-context';
import { CkDialogRef } from './dialog-ref';

/** What the service hands the container: the consumer's content and the parts of the config it shows. */
export interface CkDialogContainerSetup {
  readonly content: ComponentType<unknown> | TemplateRef<unknown>;
  readonly closeButton: boolean;
  readonly dismissible: boolean;
}

export const CK_DIALOG_SETUP = new InjectionToken<CkDialogContainerSetup>('CK_DIALOG_SETUP');

/** The dialog's own element inside the overlay: the padding, the close button and the consumer's content. */
@Component({
  selector: 'ck-dialog-container',
  imports: [CdkPortalOutlet, CkButton, CkIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-dialog',
    '[class.ck-dialog--sheet]': 'context.mode() === "sheet"',
    '[class.ck-dialog--grab]': 'context.mode() === "sheet" && setup.dismissible',
    '[class.ck-dialog--has-close]': 'setup.closeButton',
    '[class.ck-dialog--no-title]': 'context.titleId() === null',
  },
  template: `
    <div class="ck-dialog__content">
      <ng-template [cdkPortalOutlet]="portal" (attached)="onAttached($event)" />
    </div>
    @if (setup.closeButton) {
      <button
        ckButton
        type="button"
        variant="ghost"
        size="md"
        iconOnly
        class="ck-dialog__close"
        [attr.aria-label]="labels().close"
        (click)="ref.close()"
      >
        <ck-icon name="close" />
      </button>
    }
  `,
  styleUrl: './dialog.css',
})
export class CkDialogContainer {
  protected readonly context = inject(CK_DIALOG_CONTEXT);
  protected readonly setup = inject(CK_DIALOG_SETUP);
  protected readonly labels = inject(CK_LABELS);
  protected readonly ref = inject(CkDialogRef);

  protected readonly portal: Portal<unknown>;

  constructor() {
    const injector = inject(Injector);
    this.portal =
      this.setup.content instanceof TemplateRef
        ? new TemplatePortal(this.setup.content, inject(ViewContainerRef), undefined, injector)
        : new ComponentPortal(this.setup.content, null, injector);
  }

  /** A component's host element has to be a flex column too, or its body could not scroll. */
  protected onAttached(attached: ComponentRef<unknown> | EmbeddedViewRef<unknown> | null): void {
    if (attached && 'location' in attached) {
      (attached.location.nativeElement as HTMLElement).classList.add('ck-dialog__component');
    }
  }
}
