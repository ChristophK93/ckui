import { AbstractControl, FormControl, ValidationErrors, Validators } from '@angular/forms';
import { RequiredProbe } from './required-validator';

describe('RequiredProbe', () => {
  const probe = new RequiredProbe();

  it('is false without a control or validators', () => {
    expect(probe.isRequired(null)).toBe(false);
    expect(probe.isRequired(undefined)).toBe(false);
    expect(probe.isRequired(new FormControl(null))).toBe(false);
    expect(probe.isRequired(new FormControl(null, [Validators.min(1)]))).toBe(false);
  });

  it('finds Validators.required, alone or composed', () => {
    expect(probe.isRequired(new FormControl(null, Validators.required))).toBe(true);
    expect(probe.isRequired(new FormControl(null, [Validators.required, Validators.min(1)]))).toBe(
      true,
    );
  });

  it('asks a custom validator what it says about an empty value', () => {
    const custom = (control: AbstractControl): ValidationErrors | null =>
      control.value === '' ? { required: true } : null;
    expect(probe.isRequired(new FormControl(null, custom))).toBe(true);
    expect(probe.isRequired(new FormControl(null, () => ({ other: true })))).toBe(false);
  });

  it('follows a validator that is added and removed later', () => {
    const control = new FormControl(null);
    expect(probe.isRequired(control)).toBe(false);
    control.addValidators(Validators.required);
    expect(probe.isRequired(control)).toBe(true);
    control.removeValidators(Validators.required);
    expect(probe.isRequired(control)).toBe(false);
  });
});
