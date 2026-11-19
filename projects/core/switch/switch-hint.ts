import { Directive, input } from '@angular/core';
import { createCkId } from '@ckui/core/internal';

/**
 * Help text under the label of a `ck-switch`. It is part of the row, so a click on it toggles the
 * switch, and the switch's input is described by it. Give it an `id` to choose the id.
 */
@Directive({
  selector: 'ck-switch-hint',
  host: { class: 'ck-switch-hint', '[attr.id]': 'id()' },
})
export class CkSwitchHint {
  readonly id = input(createCkId('ck-switch-hint'));
}
