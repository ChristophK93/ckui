import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { hasAccessibleName } from '@ckui/core/internal';
import { CK_SEGMENTED_CONTEXT } from './context';

declare const ngDevMode: unknown;

const UNBOUND = Symbol('unbound');

/**
 * One option of a `ck-segmented`. Its content is projected: text, an icon (a direct `svg` child, always shown before the text), or both. An icon-only
 * segment needs an `aria-label`.
 */
@Component({
  selector: 'ck-segment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-segment',
    role: 'radio',
    '[class.ck-segment--checked]': 'checked()',
    '[class.ck-segment--disabled]': 'unavailable()',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-disabled]': 'unavailable() ? "true" : null',
    '[attr.tabindex]': 'tabIndex()',
    '(click)': 'group.select(this)',
  },
  template: `<span class="ck-segment__content"
    ><ng-content select="svg, ck-icon" /><span class="ck-segment__label"><ng-content /></span
  ></span>`,
})
export class CkSegment<T = unknown> {
  readonly value = input.required<T>();
  readonly disabled = input(false, { transform: booleanAttribute });

  /** @internal Used by `ck-segmented`. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly group = inject(CK_SEGMENTED_CONTEXT);

  /** @internal Used by `ck-segmented`. */
  readonly checked = computed(() => {
    const value = this.bound();
    return value !== UNBOUND && this.group.isChecked(value);
  });
  /** @internal Used by `ck-segmented`: disabled by itself or by its group. */
  readonly unavailable = computed(() => this.disabled() || this.group.groupDisabled());
  /** A segment the template has just created has no value yet, though its group already reads it. */
  private readonly bound = computed<unknown>(() => {
    try {
      return this.value();
    } catch {
      return UNBOUND;
    }
  });
  /** An unavailable segment has no tabindex at all, so a click cannot focus it either. */
  protected readonly tabIndex = computed(() => {
    if (this.unavailable()) {
      return null;
    }
    return this.group.tabStop() === this ? 0 : -1;
  });

  constructor() {
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      let destroyed = false;
      inject(DestroyRef).onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (!destroyed && !hasAccessibleName(this.element, { title: true, text: true })) {
          console.warn(
            '[ckui] ck-segment has no accessible name. An icon-only segment needs an aria-label.',
            this.element,
          );
        }
      });
    }
  }
}
