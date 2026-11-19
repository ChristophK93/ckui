import { Directive, input } from '@angular/core';
import { createCkId } from '@ckui/core/internal';

/**
 * Help text for a form control. It describes the control it sits in and stays visible next to an
 * error. Give it an `id` to choose the id; otherwise it gets one.
 */
@Directive({
  selector: 'ck-hint',
  host: { class: 'ck-hint', '[attr.id]': 'id()' },
})
export class CkHint {
  readonly id = input(createCkId('ck-hint'));
}
