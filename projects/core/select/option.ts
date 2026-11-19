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
import { CkIcon, collapseText, createCkId, readableText } from '@ckui/core/internal';
import { CK_OPTGROUP, CK_SELECT } from './select-context';

/**
 * One choice of a `ck-select`. Its content is what the list shows, and its text is what the
 * trigger shows once it is selected; put anything in it (a second line, a badge) for a richer row.
 * The check mark on the selected row is drawn by the option, not part of the content.
 */
@Component({
  selector: 'ck-option',
  imports: [CkIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-option',
    role: 'option',
    '[attr.id]': 'id()',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-disabled]': 'unavailable() ? "true" : null',
    '[class.ck-option--active]': 'active()',
    '[class.ck-option--selected]': 'selected()',
    '[class.ck-option--disabled]': 'unavailable()',
    '[hidden]': '!visible()',
    '(click)': 'choose()',
  },
  template: `
    <span class="ck-option__content"><ng-content /></span>
    @if (selected()) {
      <ck-icon class="ck-option__check" name="check" />
    }
  `,
})
export class CkOption<T = unknown> {
  /** What the select's value becomes when this option is picked. Compared with `compareWith`. */
  readonly value = input.required<T>();
  /** Greyed out: it cannot be picked and keyboard moves skip it. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Replace to use your own id; the select points `aria-activedescendant` at it. */
  readonly id = input(createCkId('ck-option'));

  private readonly select = inject(CK_SELECT);
  private readonly group = inject(CK_OPTGROUP, { optional: true });
  /** @internal */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The disabled option, or one in a disabled group. */
  readonly unavailable = computed(() => this.disabled() || (this.group?.disabled() ?? false));
  protected readonly selected = computed(() => this.select.isSelected(this));
  protected readonly active = computed(() => this.select.isActive(this));
  protected readonly visible = computed(() => this.select.isVisible(this));

  /**
   * The text of the content, with whitespace collapsed and a space between neighbouring elements
   * (`<b>A</b><i>B</i>` reads "A B"). Parts marked `aria-hidden` are left out. Read it when you
   * need it: it is not a signal.
   */
  get text(): string {
    return collapseText(readableText(this.element.querySelector('.ck-option__content')));
  }

  /** The value, or `null` while the input has not been bound yet (a required input throws until then). */
  get current(): { readonly value: T } | null {
    try {
      return { value: this.value() };
    } catch {
      return null;
    }
  }

  protected choose(): void {
    if (!this.unavailable()) {
      this.select.choose(this);
    }
  }
}
