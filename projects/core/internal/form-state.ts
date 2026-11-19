import { Injector, Signal, computed, signal } from '@angular/core';
import { AbstractControl, ControlContainer, NgControl } from '@angular/forms';

/** Where the state comes from. Both are read on every refresh, so they may resolve late. */
export interface CkFormStateSource {
  control(): NgControl | null;
  container(): ControlContainer | null;
}

interface Snapshot {
  readonly invalid: boolean;
  readonly touched: boolean;
  readonly submitted: boolean;
  readonly disabled: boolean;
}

const INITIAL_SNAPSHOT: Snapshot = {
  invalid: false,
  touched: false,
  submitted: false,
  disabled: false,
};

function sameSnapshot(previous: Snapshot, next: Snapshot): boolean {
  return (Object.keys(previous) as (keyof Snapshot)[]).every((key) => previous[key] === next[key]);
}

/**
 * The `NgControl` on the same node, looked up on first use. A component that provides
 * `NG_VALUE_ACCESSOR` cannot `inject(NgControl)` in its constructor (the control injects the
 * accessor: a cycle), so it asks from a render hook or an effect instead. Resolves `null` for a
 * control that no forms API drives, and remembers the answer.
 */
export function lazyNgControl(injector: Injector): () => NgControl | null {
  let resolved = false;
  let control: NgControl | null = null;
  return () => {
    if (!resolved) {
      resolved = true;
      control = injector.get(NgControl, null, { self: true, optional: true });
    }
    return control;
  };
}

/**
 * Reads `invalid`, `touched`, `disabled` and the form's `submitted` flag of whichever forms API drives
 * a control (Reactive Forms, `ngModel`, Signal Forms) into signals.
 *
 * Reactive Forms has no signals, so the control and its root form are subscribed to through their
 * `events`; Signal Forms state is read through signals, so call `refresh()` from an `effect` as well.
 * Browser only: callers skip it on the server.
 */
export class CkFormState {
  private readonly snapshot = signal<Snapshot>(INITIAL_SNAPSHOT, { equal: sameSnapshot });
  readonly invalid: Signal<boolean> = computed(() => this.snapshot().invalid);
  readonly touched: Signal<boolean> = computed(() => this.snapshot().touched);
  readonly submitted: Signal<boolean> = computed(() => this.snapshot().submitted);
  readonly disabled: Signal<boolean> = computed(() => this.snapshot().disabled);

  private watchedControl: AbstractControl | null = null;
  private watchedForm: AbstractControl | null = null;
  private subscriptions: { unsubscribe(): void }[] = [];

  /** `onEvent` runs when the control or its form emits; it defaults to `refresh()`. */
  constructor(
    private readonly source: CkFormStateSource,
    private readonly onEvent?: () => void,
  ) {}

  /** Copies the current state into the signals and (re)subscribes when the control changed. */
  refresh(): void {
    this.watch();
    const control = this.source.control();
    const form = this.source.container()?.formDirective as
      { submitted?: boolean } | null | undefined;
    this.snapshot.set({
      invalid: control?.invalid ?? false,
      touched: control?.touched ?? false,
      submitted: form?.submitted === true,
      disabled: control?.disabled ?? false,
    });
  }

  /** Drops the subscriptions. Call on destroy. */
  release(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
    this.watchedControl = null;
    this.watchedForm = null;
  }

  private watch(): void {
    const control = this.source.control()?.control;
    const nextControl = control instanceof AbstractControl ? control : null;
    const root = (
      this.source.container()?.formDirective as { control?: unknown } | null | undefined
    )?.control;
    const nextForm = root instanceof AbstractControl ? root : null;
    if (nextControl === this.watchedControl && nextForm === this.watchedForm) {
      return;
    }
    this.release();
    this.watchedControl = nextControl;
    this.watchedForm = nextForm;
    const listener = (): void => (this.onEvent ? this.onEvent() : this.refresh());
    for (const target of new Set([nextControl, nextForm])) {
      if (target) {
        this.subscriptions.push(target.events.subscribe(listener));
      }
    }
  }
}
