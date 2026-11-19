import { AbstractControl, FormControl, Validators } from '@angular/forms';

/**
 * Tells whether a forms control requires a value. Asks the control for `Validators.required`
 * first; a composed validator hides it, so that case asks the validator what it says about an
 * empty value (once per validator function, then remembered).
 */
export class RequiredProbe {
  private probedValidator: unknown;
  private probedVerdict = false;

  isRequired(control: AbstractControl | null | undefined): boolean {
    if (!control) {
      return false;
    }
    if (control.hasValidator?.(Validators.required)) {
      return true;
    }
    const validator = control.validator;
    if (validator !== this.probedValidator) {
      const verdict = validator?.(new FormControl(''));
      this.probedValidator = validator;
      this.probedVerdict = verdict !== null && verdict !== undefined && 'required' in verdict;
    }
    return this.probedVerdict;
  }
}
