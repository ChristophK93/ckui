import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { createCkId } from '@ckui/core/internal';
import { CK_TABS_CONTEXT, CkTabRef } from './context';

const UNBOUND = Symbol('unbound');

/**
 * One tab of a `ck-tab-list`. Its content is the label. `value` names it in the group's value and
 * ties it to its panel. A disabled tab stays visible, cannot be selected and is skipped by the
 * arrow keys.
 */
@Component({
  selector: 'ck-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-tab',
    role: 'tab',
    '[id]': 'id()',
    '[class.ck-tab--selected]': 'selected()',
    '[class.ck-tab--disabled]': 'disabled()',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-controls]': 'controls()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.tabindex]': 'tabIndex()',
    '(click)': 'group.select(this)',
  },
  template: `<span class="ck-tab__label"><ng-content /></span>`,
})
export class CkTab<T = unknown> implements CkTabRef {
  readonly value = input.required<T>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Defaults to a generated id; the panel's `aria-labelledby` follows a change. */
  readonly id = input(createCkId('ck-tab'));

  /** @internal Used by `ck-tabs` and `ck-tab-list`. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** @internal */
  readonly group = inject(CK_TABS_CONTEXT);

  /**
   * @internal A tab the template has just created has no value yet, though its group already
   * reads it.
   */
  readonly current = computed<unknown>(() => {
    try {
      return this.value();
    } catch {
      return UNBOUND;
    }
  });

  protected readonly selected = computed(() => this.group.selectedTab() === this);
  protected readonly controls = computed(() => this.group.panelIdFor(this));
  /** Never the roving 0 for a disabled tab; -1 keeps focus on a tab that becomes disabled under it. */
  protected readonly tabIndex = computed(() => (this.selected() && !this.disabled() ? 0 : -1));
}
