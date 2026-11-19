import { Directive } from '@angular/core';

/**
 * Marks the leading icon of a menu item: `<svg ckMenuItemIcon …>`. It is decoration, hidden from
 * assistive technology, so the item's text names it.
 */
@Directive({
  selector: '[ckMenuItemIcon]',
  host: { class: 'ck-menu-item__icon', 'aria-hidden': 'true' },
})
export class CkMenuItemIcon {}
