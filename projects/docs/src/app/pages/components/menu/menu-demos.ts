import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS } from '@ckui/core/dialog';

/** The confirm dialog that the Delete item of the demo opens. */
@Component({
  selector: 'docs-confirm-delete',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 ckDialogTitle>Delete this workout?</h2>
    <p ckDialogDescription>All sets are removed. This cannot be undone.</p>
    <ck-dialog-actions>
      <button ckButton ckDialogInitialFocus ckDialogClose="keep">Keep it</button>
      <button ckButton variant="danger" ckDialogClose="delete">Delete</button>
    </ck-dialog-actions>
  `,
})
export class ConfirmDelete {}
