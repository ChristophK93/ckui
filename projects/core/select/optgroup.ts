import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import { createCkId } from '@ckui/core/internal';
import { CkOption } from './option';
import { CK_OPTGROUP, CK_SELECT } from './select-context';

/** A titled group of options. It hides while none of its options match the filter. */
@Component({
  selector: 'ck-optgroup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: CK_OPTGROUP, useExisting: forwardRef(() => CkOptgroup) }],
  host: {
    class: 'ck-optgroup',
    role: 'group',
    '[attr.aria-labelledby]': 'labelId',
    '[hidden]': '!visible()',
  },
  template: `
    <span class="ck-optgroup__label" [id]="labelId">{{ label() }}</span>
    <ng-content />
  `,
})
export class CkOptgroup {
  /** The title above the group's options; it also names the group for assistive technology. */
  readonly label = input.required<string>();
  /** Disables every option in the group. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly select = inject(CK_SELECT);
  private readonly options = contentChildren(CkOption, { descendants: true });
  protected readonly labelId = createCkId('ck-optgroup-label');

  protected readonly visible = computed(() =>
    this.options().some((option) => this.select.isVisible(option)),
  );
}
