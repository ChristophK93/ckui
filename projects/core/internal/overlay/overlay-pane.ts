import { CdkPortalOutlet, Portal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  ViewContainerRef,
  ViewEncapsulation,
  inject,
  input,
  viewChild,
} from '@angular/core';

/** What the overlay host puts inside every CDK pane: the grab area of a sheet and the caller's content. */
@Component({
  selector: 'ck-overlay-pane',
  imports: [CdkPortalOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ck-overlay-pane' },
  template: `
    @if (grab()) {
      <div class="ck-overlay-grab" data-ck-sheet-grab aria-hidden="true">
        <span class="ck-overlay-grab-bar"></span>
      </div>
    }
    <ng-template cdkPortalOutlet />
  `,
  styles: `
    @layer ckui {
      .ck-overlay-backdrop {
        position: absolute;
        inset: 0;
        z-index: -1;
        background: var(--ck-color-backdrop);
        pointer-events: auto;
        touch-action: manipulation;
      }

      @media (forced-colors: active) {
        .ck-overlay-backdrop {
          forced-color-adjust: none;
        }
      }

      .ck-overlay-pane {
        position: relative;
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        min-inline-size: 0;
        min-block-size: 0;
        max-block-size: 100%;
      }

      .ck-overlay-pane > :not(.ck-overlay-grab) {
        flex: 1 1 auto;
        min-block-size: 0;
      }

      .ck-overlay-grab {
        display: flex;
        flex: none;
        justify-content: center;
        block-size: var(--ck-target-min);
        border-start-start-radius: var(--ck-radius-xl);
        border-start-end-radius: var(--ck-radius-xl);
        background: var(--ck-sheet-grab-bg, var(--ck-color-surface-raised));
        touch-action: none;
      }

      .ck-overlay-grab-bar {
        margin-block-start: var(--ck-space-2);
        inline-size: var(--ck-space-10);
        block-size: var(--ck-space-1);
        border-radius: var(--ck-radius-full);
        background: var(--ck-color-border);
      }

      @media (forced-colors: active) {
        .ck-overlay {
          border: 1px solid CanvasText;
        }

        .ck-overlay-grab-bar {
          background: CanvasText;
        }
      }
    }
  `,
})
export class CkOverlayPane {
  readonly grab = input(false);

  private readonly outlet = viewChild.required(CdkPortalOutlet);
  readonly viewContainerRef = inject(ViewContainerRef);

  attach(portal: Portal<unknown>): void {
    this.outlet().attach(portal);
  }
}
