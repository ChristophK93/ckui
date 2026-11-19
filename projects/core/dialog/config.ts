import { Injector } from '@angular/core';

export type CkDialogRole = 'dialog' | 'alertdialog';
/** Largest inline size of a modal dialog: 24, 32 or 48rem. */
export type CkDialogWidth = 'sm' | 'md' | 'lg';
/** `auto` opens a sheet on a narrow screen with a coarse pointer, a centred modal otherwise. */
export type CkDialogMode = 'auto' | 'modal' | 'sheet';

export interface CkDialogConfig<D = unknown> {
  /** What the content gets from `inject(CK_DIALOG_DATA)`. */
  data?: D;
  /** `alertdialog` for a message the user has to answer. Default `dialog`. */
  role?: CkDialogRole;
  /** Default `md`. Under a sheet the dialog is as wide as the screen. */
  width?: CkDialogWidth;
  /** Escape, a click on the backdrop and a swipe down close the dialog. Default `true`. */
  dismissible?: boolean;
  /** Shows the close button next to the title. Default `true`. */
  closeButton?: boolean;
  /** Default `auto`, decided at the moment the dialog opens. */
  mode?: CkDialogMode;
  /** A sheet as tall as the screen allows instead of as tall as its content. Default `false`. */
  fullHeight?: boolean;
  /**
   * The parent injector of a component's content, for providers the app root doesn't have (route
   * level, or the opener's own): pass `inject(Injector)` from the opener. `CK_DIALOG_DATA` and
   * `CkDialogRef` are provided on top. Template content keeps the injector of its template.
   */
  injector?: Injector;
  /** The accessible name when the content has no `ckDialogTitle`. */
  ariaLabel?: string;
}
