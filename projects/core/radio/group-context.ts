import { InjectionToken, Signal } from '@angular/core';
import { CkSize } from '@ckui/core';

/** What a `ck-radio` asks of the `ck-radio-group` around it. Internal, not exported from the entry point. */
export interface CkRadioGroupContext {
  /** The group's size, which every radio takes. */
  readonly size: Signal<CkSize | undefined>;
  /** The `name` all native inputs of the group share. */
  readonly name: Signal<string>;
  readonly disabled: Signal<boolean>;
  /** The group shows its errors, so every radio is `aria-invalid`. */
  readonly invalid: Signal<boolean>;
  isChecked(option: unknown): boolean;
  /** A user change: the radio of this option is now checked. */
  select(option: unknown): void;
  /** Puts the native checked state of every radio back to the group's value. */
  resync(): void;
}

export const CK_RADIO_GROUP = new InjectionToken<CkRadioGroupContext>('CK_RADIO_GROUP');
