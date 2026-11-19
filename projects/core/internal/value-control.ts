import {
  DestroyRef,
  Directive,
  ModelSignal,
  Provider,
  Type,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';

const noop = (): void => undefined;

/**
 * Base for components that edit one value.
 *
 * Reactive Forms, `ngModel` and Signal Forms all talk to the component through the
 * `ControlValueAccessor` registered by `provideCkValueAccessor`: Angular's `[formField]` prefers a
 * value accessor on the same node over the `value` model contract, so only that one path is ever
 * active. The `value` model and `disabled` input are for standalone use (`[(value)]`) and for the
 * template.
 *
 * `value` is `undefined` until something sets it; a subclass with a `null` default reads
 * `value() ?? null`.
 */
@Directive()
export abstract class CkValueControl<T> implements ControlValueAccessor, FormValueControl<T> {
  readonly value: ModelSignal<T> = model(undefined as T);
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Only ever becomes `true` here: `markAsUntouched()` and `reset()` do not travel through a value
   * accessor. Do not style from it; read the form's own state (`ng-touched`, the field's `touched()`).
   */
  readonly touched = model(false);

  private readonly controlDisabled = signal(false);
  private readonly controlDestroyRef = inject(DestroyRef);
  private onChange: (value: T) => void = noop;
  private onTouched: () => void = noop;

  /** The `disabled` input or the forms API (`control.disable()`, a disabled field) says so. */
  protected readonly isDisabled = computed(() => this.disabled() || this.controlDisabled());

  writeValue(value: T): void {
    this.value.set(value);
  }

  registerOnChange(onChange: (value: T) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.controlDisabled.set(isDisabled);
  }

  /** A change made by the user. Ignored while disabled, destroyed or when the value is the current one. */
  protected commit(value: T): void {
    if (this.controlDestroyRef.destroyed || this.isDisabled() || Object.is(value, this.value())) {
      return;
    }
    this.value.set(value);
    this.onChange(value);
  }

  /**
   * Call when focus leaves the whole control, not a part of it. Ignored once destroyed: removing a
   * focused element from the page fires its blur after the outputs are gone.
   */
  protected markTouched(): void {
    if (this.controlDestroyRef.destroyed) {
      return;
    }
    this.touched.set(true);
    this.onTouched();
  }
}

/** Registers the component as a value accessor: `providers: [provideCkValueAccessor(CkSegmented)]`. */
export function provideCkValueAccessor(type: Type<unknown>): Provider {
  return { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => type), multi: true };
}
