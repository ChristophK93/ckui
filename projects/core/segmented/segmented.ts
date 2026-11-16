import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import { CK_CONFIG, CkSize } from '@ckui/core';
import { CkValueControl, hasAccessibleName, provideCkValueAccessor } from '@ckui/core/internal';
import { CK_SEGMENTED_CONTEXT, CkSegmentRef, CkSegmentedContext } from './context';
import { CkSegment } from './segment';

declare const ngDevMode: unknown;

/** -1 for the previous segment, 1 for the next one, 0 for a key that does not move. */
function stepOf(key: string, rtl: boolean): -1 | 0 | 1 {
  switch (key) {
    case 'ArrowUp':
      return -1;
    case 'ArrowDown':
      return 1;
    case 'ArrowLeft':
      return rtl ? 1 : -1;
    case 'ArrowRight':
      return rtl ? -1 : 1;
    default:
      return 0;
  }
}

/**
 * A group of mutually exclusive options that behaves as one radio group: one tab stop, the arrow
 * keys move and select. Direction comes from the `dir` attribute (`:dir(rtl)`), not from the CSS
 * `direction` property. The value is the `value` of the selected `ck-segment`, or `null`.
 */
@Component({
  selector: 'ck-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideCkValueAccessor(CkSegmented),
    { provide: CK_SEGMENTED_CONTEXT, useExisting: forwardRef(() => CkSegmented) },
  ],
  host: {
    class: 'ck-segmented',
    role: 'radiogroup',
    '[class]': 'modifierClasses()',
    '[class.ck-segmented--has-value]': 'checkedIndex() >= 0',
    '[class.ck-segmented--disabled]': 'isDisabled()',
    '[class.ck-segmented--full-width]': 'fullWidth()',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[style.--_ck-segmented-count]': 'segments().length',
    '[style.--_ck-segmented-index]': 'checkedIndex()',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `<span class="ck-segmented__indicator" aria-hidden="true"></span><ng-content />`,
  styleUrl: './segmented.css',
})
export class CkSegmented<T = unknown>
  extends CkValueControl<T | null>
  implements CkSegmentedContext
{
  /** `undefined` uses the size from `provideCkui`. */
  readonly size = input<CkSize | undefined>(undefined);
  /** Stretches the group to the width of its container; by default it is as wide as its segments. */
  readonly fullWidth = input(false, { transform: booleanAttribute });

  private readonly config = inject(CK_CONFIG);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly segments = contentChildren(CkSegment, { descendants: true });

  protected readonly modifierClasses = computed(
    () => `ck-segmented--${this.size() ?? this.config.size}`,
  );

  private readonly current = computed(() => this.value() ?? null);
  protected readonly checkedIndex = computed(() =>
    this.segments().findIndex((segment) => segment.checked()),
  );

  /** @internal Used by `ck-segment`. */
  readonly groupDisabled = computed(() => this.isDisabled());

  /** @internal Used by `ck-segment`. The checked segment, else the first one that can be used. */
  readonly tabStop = computed<CkSegmentRef | null>(() => {
    if (this.isDisabled()) {
      return null;
    }
    const usable = this.segments().filter((segment) => !segment.unavailable());
    return usable.find((segment) => segment.checked()) ?? usable[0] ?? null;
  });

  constructor() {
    super();
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      let destroyed = false;
      inject(DestroyRef).onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (!destroyed && !hasAccessibleName(this.element, { title: false, text: false })) {
          console.warn(
            '[ckui] ck-segmented has no accessible name. Add an aria-label or aria-labelledby.',
            this.element,
          );
        }
      });
    }
  }

  /** @internal Used by `ck-segment`. */
  isChecked(value: unknown): boolean {
    const current = this.current();
    return current !== null && Object.is(current, value);
  }

  /** @internal Used by `ck-segment`. */
  select(segment: CkSegmentRef): void {
    if (!segment.unavailable()) {
      this.commit(segment.value() as T);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target as Node;
    const segments = this.segments();
    const focused = segments.find((segment) => segment.element.contains(target));
    if (focused === undefined) {
      return;
    }
    const usable = segments.filter((segment) => !segment.unavailable());
    if (usable.length === 0) {
      return;
    }

    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.select(focused);
      return;
    }

    const next = this.targetOf(event.key, focused, usable);
    if (next === null) {
      return;
    }
    event.preventDefault();
    this.select(next);
    next.element.focus();
  }

  /** The segment a navigation key leads to, or `null` for a key that does not navigate. */
  private targetOf(key: string, focused: CkSegment, usable: CkSegment[]): CkSegment | null {
    const last = usable.length - 1;
    if (key === 'Home') {
      return usable[0];
    }
    if (key === 'End') {
      return usable[last];
    }
    const step = stepOf(key, this.element.matches(':dir(rtl)'));
    if (step === 0) {
      return null;
    }
    const from = usable.indexOf(focused);
    if (from < 0) {
      return step > 0 ? usable[0] : usable[last];
    }
    return usable[(from + step + usable.length) % usable.length];
  }

  protected onFocusOut(event: FocusEvent): void {
    const entering = event.relatedTarget;
    if (this.isDisabled()) {
      return;
    }
    if (!(entering instanceof Node) || !this.element.contains(entering)) {
      this.markTouched();
    }
  }
}
