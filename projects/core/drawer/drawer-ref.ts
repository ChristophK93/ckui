import { CK_DIALOG_DATA, CkDialogRef } from '@ckui/core/dialog';

/**
 * What a component opened with `CkDrawer` injects for its `data`. It is the dialog's data token,
 * so content written for a dialog works unchanged in a drawer.
 */
export const CK_DRAWER_DATA = CK_DIALOG_DATA;

/**
 * The ref of an open drawer: `close(result?)`, `closed` and `closing`. It is the dialog's ref, so
 * `inject(CkDrawerRef)` works inside the drawer's content.
 */
export const CkDrawerRef = CkDialogRef;
export type CkDrawerRef<R = unknown> = CkDialogRef<R>;
