import { InjectionToken, Signal, computed, signal } from '@angular/core';
import { CkDialogMode } from './config';

/** The ids of every title (or description) in the dialog; the newest one names it. */
export class CkDialogIds {
  private readonly entries = signal<readonly Signal<string>[]>([]);
  readonly current = computed(() => this.entries().at(-1)?.() ?? null);

  /** Returns the function that takes the entry out again; it leaves the others alone. */
  add(id: Signal<string>): () => void {
    this.entries.update((entries) => [...entries, id]);
    return () => this.entries.update((entries) => entries.filter((entry) => entry !== id));
  }
}

/** What the building blocks inside a dialog tell the dialog: the ids that name it. */
export class CkDialogContext {
  readonly titles = new CkDialogIds();
  readonly descriptions = new CkDialogIds();
  readonly titleId = this.titles.current;
  readonly descriptionId = this.descriptions.current;
  /** Resolved when the dialog opens. */
  readonly mode = signal<Exclude<CkDialogMode, 'auto'>>('modal');
}

export const CK_DIALOG_CONTEXT = new InjectionToken<CkDialogContext>('CK_DIALOG_CONTEXT');
