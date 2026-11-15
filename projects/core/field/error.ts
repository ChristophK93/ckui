import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, PLATFORM_ID, Renderer2, computed, inject } from '@angular/core';
import { createCkId } from '@ckui/core/internal';
import { CK_FIELD_CONTEXT } from './control-state';

declare const ngDevMode: unknown;

/**
 * An error message in a field. It is hidden until the field shows errors, whatever the consumer
 * renders, and it joins the control's description while it is visible.
 */
@Directive({
  selector: 'ck-error',
  host: {
    class: 'ck-error',
    '[hidden]': 'hidden()',
  },
})
export class CkError {
  private readonly field = inject(CK_FIELD_CONTEXT, { optional: true });
  protected readonly hidden = computed(() => this.field !== null && !this.field.errorsVisible());

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if (isPlatformBrowser(inject(PLATFORM_ID)) && element.id === '') {
      inject(Renderer2).setAttribute(element, 'id', createCkId('ck-error'));
    }
    if (typeof ngDevMode !== 'undefined' && ngDevMode && this.field === null) {
      console.warn('[ckui] ck-error is outside a ck-field, so it is always visible.', element);
    }
  }
}
