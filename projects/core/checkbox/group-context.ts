import { InjectionToken, Signal } from '@angular/core';
import { CkSize } from '@ckui/core';

/** What a `ck-checkbox` asks of the `ck-checkbox-group` around it. Internal, not exported from the entry point. */
export interface CkCheckboxGroupContext {
  /** The group's size, the default for its checkboxes. */
  readonly size: Signal<CkSize | undefined>;
  readonly disabled: Signal<boolean>;
  /** The group shows its errors, so every checkbox is `aria-invalid`. */
  readonly invalid: Signal<boolean>;
  isChecked(option: unknown): boolean;
  /** A user change: the checkbox of this option is now `checked`. */
  toggle(option: unknown, checked: boolean): void;
}

export const CK_CHECKBOX_GROUP = new InjectionToken<CkCheckboxGroupContext>('CK_CHECKBOX_GROUP');

/** The default of a checkbox's `option` input, so "not set" differs from an option of `undefined`. */
export const CK_NO_OPTION: unique symbol = Symbol('CK_NO_OPTION');
