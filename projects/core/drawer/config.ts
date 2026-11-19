import { Injector } from '@angular/core';
import { CkDialogRole } from '@ckui/core/dialog';

/** Inline size of a side panel: 20, 24 or 32rem, never wider than the screen minus a margin. */
export type CkDrawerWidth = 'sm' | 'md' | 'lg';
/** The edge the panel slides in from. `end` is the right edge in a left-to-right page, the left edge in a right-to-left one. */
export type CkDrawerSide = 'start' | 'end';
/**
 * `auto` opens a bottom sheet on a narrow screen with a coarse pointer, a full-height side panel
 * otherwise. Decided at the moment the drawer opens.
 */
export type CkDrawerMode = 'auto' | 'side' | 'sheet';

export interface CkDrawerConfig<D = unknown> {
  /** What the content gets from `inject(CK_DRAWER_DATA)`. */
  data?: D;
  /** `alertdialog` for a message the user has to answer. Default `dialog`. */
  role?: CkDialogRole;
  /** The edge of a side panel. Default `end`. */
  side?: CkDrawerSide;
  /** Default `auto`, decided at the moment the drawer opens. */
  mode?: CkDrawerMode;
  /** Default `md`. As a sheet the drawer is as wide as the screen. */
  width?: CkDrawerWidth;
  /** Escape and a click on the backdrop close the drawer, and a swipe down closes a sheet. Default `true`. */
  dismissible?: boolean;
  /** Shows the close button next to the title. Default `true`. */
  closeButton?: boolean;
  /** A sheet as tall as the screen allows instead of as tall as its content. Default `false`. */
  fullHeight?: boolean;
  /**
   * The parent injector of a component's content, for providers the app root doesn't have (route
   * level, or the opener's own): pass `inject(Injector)` from the opener. `CK_DRAWER_DATA` and
   * `CkDrawerRef` are provided on top. Template content keeps the injector of its template.
   */
  injector?: Injector;
  /** The accessible name when the content has no `ckDialogTitle`. */
  ariaLabel?: string;
}
