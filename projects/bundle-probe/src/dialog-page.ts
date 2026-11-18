import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CK_DIALOG_IMPORTS } from '@ckui/core/dialog';

@Component({
  selector: 'probe-dialog-page',
  imports: [CK_DIALOG_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ck-dialog [(open)]="open">
      <ng-template>
        <h2 ckDialogTitle>Probe</h2>
        <ck-dialog-body>Content</ck-dialog-body>
      </ng-template>
    </ck-dialog>
  `,
})
export class DialogPage {
  protected readonly open = signal(false);
}
