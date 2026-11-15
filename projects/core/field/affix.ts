import { Directive } from '@angular/core';

/** Content before the control: text such as `€`, an icon, or a button. */
@Directive({
  selector: '[ckPrefix]',
  host: { class: 'ck-prefix' },
})
export class CkPrefix {}

/** Content after the control: text, an icon, or a button such as a password toggle. */
@Directive({
  selector: '[ckSuffix]',
  host: { class: 'ck-suffix' },
})
export class CkSuffix {}
