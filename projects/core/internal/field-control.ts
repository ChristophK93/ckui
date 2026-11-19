import { InjectionToken, Signal } from '@angular/core';
import { CkSize } from '@ckui/core';

/** What `ck-field` asks of its control for the ARIA attributes on the focusable element. */
export interface CkAriaWiring {
  readonly describedBy: readonly string[];
  /** Every hint and error id of the field, shown or not; tokens with these ids belong to the field. */
  readonly libraryIds: readonly string[];
  readonly invalid: boolean;
  readonly required: boolean;
}

/**
 * What a control tells `ck-field` about itself. Any control that provides `CK_CONTROL_STATE` can
 * sit in a field's main slot: `ckInput`, `ck-stepper`, later `ck-select`.
 */
export interface CkControlState {
  /** The focusable element the field's `<label for>` points at and whose ARIA the field writes. */
  readonly element: HTMLElement;
  readonly id: Signal<string>;
  readonly focused: Signal<boolean>;
  readonly hasValue: Signal<boolean>;
  readonly hasPlaceholder: Signal<boolean>;
  /** The control draws something where a resting label would sit (a picker, buttons): the label stays floated. */
  readonly builtInUi: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly submitted: Signal<boolean>;
  /** Counts value changes, however they happened (typing, forms API, `[value]`). */
  readonly version: Signal<number>;
  setWiring(wiring: CkAriaWiring): void;
}

/** What a control asks of the surrounding `ck-field`. */
export interface CkFieldContext {
  readonly resolvedSize: Signal<CkSize>;
}

export const CK_CONTROL_STATE = new InjectionToken<CkControlState>('CK_CONTROL_STATE');
export const CK_FIELD_CONTEXT = new InjectionToken<CkFieldContext>('CK_FIELD_CONTEXT');
