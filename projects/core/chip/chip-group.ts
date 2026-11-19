import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  inject,
} from '@angular/core';
import { hasAccessibleName } from '@ckui/core/internal';

declare const ngDevMode: unknown;

/**
 * A wrapping row of chips. It is a `group` and needs a name: `aria-label` or `aria-labelledby`.
 * The gap between the chips is `--ck-chip-group-gap`.
 */
@Component({
  selector: 'ck-chip-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ck-chip-group', role: 'group' },
  template: '<ng-content />',
  styleUrl: './chip-group.css',
})
export class CkChipGroup {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    if (typeof ngDevMode !== 'undefined' && ngDevMode && isPlatformBrowser(inject(PLATFORM_ID))) {
      let destroyed = false;
      inject(DestroyRef).onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (!destroyed && !hasAccessibleName(this.element, { title: false, text: false })) {
          console.warn(
            '[ckui] ck-chip-group has no accessible name. Add an aria-label or aria-labelledby.',
            this.element,
          );
        }
      });
    }
  }
}
