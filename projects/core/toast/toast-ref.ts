export type CkToastTone = 'neutral' | 'success' | 'warning' | 'danger';

export type CkToastDismissReason = 'timeout' | 'user' | 'action' | 'replaced' | 'programmatic';

export interface CkToastAction {
  /** Visible label and accessible name of the button. */
  label: string;
  /** Runs when the button is activated; the toast then closes with the reason `action`. */
  run: () => void;
}

export interface CkToastOptions {
  /** Plain text; it is never parsed as HTML. */
  message: string;
  title?: string;
  /** Default `neutral`. */
  tone?: CkToastTone;
  action?: CkToastAction;
  /**
   * Milliseconds until the toast closes by itself. Default 5000. A toast with an `action` or tone
   * `danger` stays until dismissed unless a duration is given. `null`, `0`, a negative or a
   * non-finite number mean "stay until dismissed".
   */
  duration?: number | null;
  /** A toast with the id of one that is still open replaces it in place instead of stacking. */
  id?: string;
}

/** What a `CkToastRef` calls into; supplied by `CkToast`, not by consumers. */
export interface CkToastRefControls {
  readonly dismissed: Promise<CkToastDismissReason>;
  dismiss(): void;
  update(options: Partial<CkToastOptions>): void;
}

/** Controls one toast. Returned by `CkToast.show`; never constructed directly. */
export class CkToastRef {
  /** Resolves once, with the reason the toast closed. `replaced` when a toast with the same `id` took its place. */
  readonly dismissed: Promise<CkToastDismissReason>;
  private readonly controls: CkToastRefControls;

  constructor(controls: CkToastRefControls) {
    this.controls = controls;
    this.dismissed = controls.dismissed;
  }

  /** Closes the toast with the reason `programmatic`. Does nothing once it is closed or replaced. */
  dismiss(): void {
    this.controls.dismiss();
  }

  /**
   * Changes the shown content and restarts the timer. A key passed as `undefined` removes the title
   * or action, or restores the default duration; `id` cannot change. Text that changes is announced
   * again. Does nothing once the toast is closed or replaced.
   */
  update(options: Partial<CkToastOptions>): void {
    this.controls.update(options);
  }
}
