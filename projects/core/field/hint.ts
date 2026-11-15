import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, PLATFORM_ID, Renderer2, inject } from '@angular/core';
import { createCkId } from '@ckui/core/internal';

/** Help text under a field. It stays visible next to an error and is part of the control's description. */
@Directive({
  selector: 'ck-hint',
  host: { class: 'ck-hint' },
})
export class CkHint {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if (isPlatformBrowser(inject(PLATFORM_ID)) && element.id === '') {
      inject(Renderer2).setAttribute(element, 'id', createCkId('ck-hint'));
    }
  }
}
