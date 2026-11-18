import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

declare const ngDevMode: unknown;

export type CkBadgeTone = 'neutral' | 'success' | 'warning' | 'danger';
export type CkBadgeSize = 'sm' | 'md';

const TONES: readonly CkBadgeTone[] = ['neutral', 'success', 'warning', 'danger'];
const SIZES: readonly CkBadgeSize[] = ['sm', 'md'];

/** Marks a projected element (usually an `svg`) as the badge's leading icon. It is decorative. */
@Directive({
  selector: '[ckBadgeIcon]',
  host: { class: 'ck-badge__icon', 'aria-hidden': 'true' },
})
export class CkBadgeIcon {}

/**
 * A small, non-interactive status label: a pill with text, an optional leading dot or icon. It is
 * not a live region and has no role; the text must say what the status is, colour never does.
 */
@Component({
  selector: 'ck-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'modifierClasses()',
  },
  template: `@if (dot()) {
      <span class="ck-badge__dot" aria-hidden="true"></span>
    }
    <ng-content select="[ckBadgeIcon]" /><span class="ck-badge__text"><ng-content /></span>`,
  styleUrl: './badge.css',
})
export class CkBadge {
  /** Colours of the badge. An unknown value falls back to `neutral`. */
  readonly tone = input<CkBadgeTone>('neutral');
  /** Adds a leading dot in the text colour. */
  readonly dot = input(false, { transform: booleanAttribute });
  /** `md` is a 1.5rem pill, `sm` a smaller one for dense lists. An unknown value falls back to `md`. */
  readonly size = input<CkBadgeSize>('md');

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly modifierClasses = computed(() => {
    const tone = TONES.includes(this.tone()) ? this.tone() : 'neutral';
    const size = SIZES.includes(this.size()) ? this.size() : 'md';
    return `ck-badge ck-badge--${tone} ck-badge--${size}`;
  });

  constructor() {
    if (typeof ngDevMode !== 'undefined' && ngDevMode && isPlatformBrowser(inject(PLATFORM_ID))) {
      let destroyed = false;
      inject(DestroyRef).onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        const text = this.element.querySelector('.ck-badge__text');
        if (!destroyed && (text?.textContent ?? '').trim() === '') {
          console.warn(
            '[ckui] ck-badge has no text. The text must state the status; a dot or an icon alone is colour alone.',
            this.element,
          );
        }
      });
    }
  }
}
