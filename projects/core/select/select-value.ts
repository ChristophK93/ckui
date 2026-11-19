import { Directive, TemplateRef, inject } from '@angular/core';

/** What the trigger's value template gets: the selected option as plain values. */
export interface CkSelectedOption<T = unknown> {
  /** The option's value. */
  readonly value: T;
  /** The option's text, as the trigger shows it without a template. */
  readonly text: string;
}

export interface CkSelectValueContext<T = unknown> {
  $implicit: CkSelectedOption<T>;
}

/**
 * Marks the template that draws the selected option on the trigger instead of its plain text:
 * `<ng-template ckSelectValue let-option>{{ option.text }}</ng-template>` inside `ck-select`;
 * `option` has the `value` and the `text` of the selected option. It is only drawn
 * while an option is selected; the placeholder stays as it is.
 */
@Directive({ selector: 'ng-template[ckSelectValue]' })
export class CkSelectValue<T = unknown> {
  readonly template = inject<TemplateRef<CkSelectValueContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _directive: CkSelectValue<T>,
    // Only the type predicate reads it: it types `let-option` in templates.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is CkSelectValueContext<T> {
    return true;
  }
}
