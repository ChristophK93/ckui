import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { hasAccessibleName } from '@ckui/core/internal';

declare const ngDevMode: unknown;

const DEFAULT_MAX = 100;

const isValidMax = (max: unknown): max is number =>
  typeof max === 'number' && Number.isFinite(max) && max > 0;

/**
 * A horizontal progress bar. A number `value` fills the track up to `value / max`; `null` (or a
 * value that is not a number) shows an indeterminate bar. It is not a live region: announce
 * milestones yourself.
 */
@Component({
  selector: 'ck-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-progress',
    role: 'progressbar',
    'aria-valuemin': '0',
    '[class.ck-progress--indeterminate]': 'indeterminate()',
    '[attr.aria-valuemax]': 'limit()',
    '[attr.aria-valuenow]': 'current()',
    '[attr.aria-valuetext]': 'valueText() || null',
    '[style.--_ck-progress-fraction]': 'fraction()',
  },
  // Two elements, so a switch between the two states starts the fill from its final style, not
  // from the sliding segment's transform and width.
  template: `@if (indeterminate()) {
      <span class="ck-progress__fill ck-progress__fill--slide"></span>
    } @else {
      <span class="ck-progress__fill"></span>
    }`,
  styleUrl: './progress.css',
})
export class CkProgress {
  /**
   * The progress, from 0 to `max`. Below 0 counts as 0 and above `max` as `max`. `null`,
   * `undefined` and `NaN` show an indeterminate bar without `aria-valuenow`.
   */
  readonly value = input<number | null | undefined>(null);
  /** The value that means done. Anything that is not a number above 0 counts as 100. */
  readonly max = input<number>(DEFAULT_MAX);
  /** Text for `aria-valuetext`, such as "Step 2 of 7". Without it assistive technology reads the percentage. */
  readonly valueText = input<string | undefined>(undefined);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** @internal */
  protected readonly limit = computed(() => {
    const max = this.max();
    return isValidMax(max) ? max : DEFAULT_MAX;
  });

  /** The clamped value, or `null` while the bar is indeterminate. */
  protected readonly current = computed<number | null>(() => {
    const value = this.value();
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }
    return Math.min(Math.max(value, 0), this.limit());
  });

  protected readonly indeterminate = computed(() => this.current() === null);
  protected readonly fraction = computed(() => (this.current() ?? 0) / this.limit());

  constructor() {
    if (typeof ngDevMode !== 'undefined' && ngDevMode && isPlatformBrowser(inject(PLATFORM_ID))) {
      let destroyed = false;
      inject(DestroyRef).onDestroy(() => (destroyed = true));
      let warnedMax = false;
      effect(() => {
        const max = this.max();
        if (!warnedMax && !destroyed && !isValidMax(max)) {
          warnedMax = true;
          console.warn(
            `[ckui] ck-progress got max=${String(max)}, which is not a number above 0. It counts as ${DEFAULT_MAX}.`,
            this.element,
          );
        }
      });
      afterNextRender(() => {
        if (!destroyed && !hasAccessibleName(this.element, { title: false, text: false })) {
          console.warn(
            '[ckui] ck-progress has no accessible name. Add an aria-label or aria-labelledby.',
            this.element,
          );
        }
      });
    }
  }
}
