import {
  CkDialogActions,
  CkDialogBody,
  CkDialogClose,
  CkDialogDescription,
  CkDialogInitialFocus,
  CkDialogTitle,
} from '@ckui/core/dialog';
import { CkDrawerComponent } from './drawer.component';

export type { CkDrawerConfig, CkDrawerMode, CkDrawerSide, CkDrawerWidth } from './config';
export { CkDrawer } from './drawer.service';
export { CkDrawerComponent } from './drawer.component';
export {
  CkDialogActions,
  CkDialogBody,
  CkDialogClose,
  CkDialogDescription,
  CkDialogInitialFocus,
  CkDialogTitle,
} from '@ckui/core/dialog';

export { CK_DRAWER_DATA, CkDrawerRef } from './drawer-ref';

/**
 * Everything a template needs for a drawer: `imports: [CK_DRAWER_IMPORTS]`. The building blocks
 * are the dialog's: `ckDialogTitle`, `ckDialogDescription`, `ck-dialog-body`,
 * `ck-dialog-actions`, `ckDialogClose` and `ckDialogInitialFocus`.
 */
export const CK_DRAWER_IMPORTS = [
  CkDrawerComponent,
  CkDialogTitle,
  CkDialogDescription,
  CkDialogBody,
  CkDialogActions,
  CkDialogClose,
  CkDialogInitialFocus,
] as const;
