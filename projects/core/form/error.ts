import { Directive, ElementRef, computed, inject, input } from '@angular/core';
import { CK_MESSAGES_CONTEXT, createCkId } from '@ckui/core/internal';

declare const ngDevMode: unknown;

/**
 * An error message for a form control. It is hidden until the control shows errors, whatever the
 * consumer renders, and it joins the control's description while it is visible. Give it an `id` to
 * choose the id; otherwise it gets one.
 */
@Directive({
  selector: 'ck-error',
  host: {
    class: 'ck-error',
    '[attr.id]': 'id()',
    '[hidden]': 'hidden()',
  },
})
export class CkError {
  readonly id = input(createCkId('ck-error'));

  private readonly context = inject(CK_MESSAGES_CONTEXT, { optional: true });
  protected readonly hidden = computed(
    () => this.context !== null && !this.context.errorsVisible(),
  );

  constructor() {
    if (typeof ngDevMode !== 'undefined' && ngDevMode && this.context === null) {
      console.warn(
        '[ckui] ck-error is outside a ck-field or another control that shows errors, so it is always visible.',
        inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
      );
    }
  }
}
