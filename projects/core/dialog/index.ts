import { CkDialogComponent } from './dialog.component';
import {
  CkDialogActions,
  CkDialogBody,
  CkDialogClose,
  CkDialogDescription,
  CkDialogInitialFocus,
  CkDialogTitle,
} from './dialog-parts';

export type { CkDialogConfig, CkDialogMode, CkDialogRole, CkDialogWidth } from './config';
export { CK_DIALOG_DATA } from './config';
export { CkDialogRef } from './dialog-ref';
export { CkDialog } from './dialog.service';
export { CkDialogComponent } from './dialog.component';
export {
  CkDialogActions,
  CkDialogBody,
  CkDialogClose,
  CkDialogDescription,
  CkDialogInitialFocus,
  CkDialogTitle,
} from './dialog-parts';

/** Everything a template needs for a dialog: `imports: [CK_DIALOG_IMPORTS]`. */
export const CK_DIALOG_IMPORTS = [
  CkDialogComponent,
  CkDialogTitle,
  CkDialogDescription,
  CkDialogBody,
  CkDialogActions,
  CkDialogClose,
  CkDialogInitialFocus,
] as const;
