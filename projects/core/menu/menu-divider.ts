import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/** A line between two groups of menu items, `role="separator"`. */
@Component({
  selector: 'ck-menu-divider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ck-menu-divider', role: 'separator' },
  template: '',
})
export class CkMenuDivider {}
