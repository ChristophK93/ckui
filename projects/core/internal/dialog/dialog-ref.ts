/** What a `CkDialogRef` calls into; supplied by `CkDialog`, not by consumers. */
export interface CkDialogRefControls<R> {
  readonly closing: Promise<void>;
  readonly closed: Promise<R | undefined>;
  close(result: R | undefined): void;
}

/** Controls one open dialog or drawer. Returned by `CkDialog.open` and `CkDrawer.open`, injected by its content; never constructed directly. */
export class CkDialogRef<R = unknown> {
  /**
   * Resolves once, after the dialog has left the screen, with the result of the first `close()`.
   * Escape, a click on the backdrop and a swipe resolve it with `undefined`, and so does destroying
   * the app.
   */
  readonly closed: Promise<R | undefined>;
  /**
   * Resolves once, the moment the dialog starts to close (before the leave animation), whatever
   * the cause. `closed` follows when it has left the screen.
   */
  readonly closing: Promise<void>;
  private readonly controls: CkDialogRefControls<R>;

  constructor(controls: CkDialogRefControls<R>) {
    this.controls = controls;
    this.closed = controls.closed;
    this.closing = controls.closing;
  }

  /** Closes the dialog. Only the first call counts; later ones, with another result too, do nothing. */
  close(result?: R): void {
    this.controls.close(result);
  }
}
