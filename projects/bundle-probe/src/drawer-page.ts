import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CK_DRAWER_IMPORTS } from '@ckui/core/drawer';

@Component({
  selector: 'probe-drawer-page',
  imports: [CK_DRAWER_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ck-drawer [(open)]="open">
      <ng-template>
        <h2 ckDialogTitle>Probe</h2>
        <ck-dialog-body>Content</ck-dialog-body>
      </ng-template>
    </ck-drawer>
  `,
})
export class DrawerPage {
  protected readonly open = signal(false);
}
