import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  Renderer2,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
} from '@angular/core';
import { CkSize } from '@ckui/core';
import { CkIcon, hasAccessibleName } from '@ckui/core/internal';

declare const ngDevMode: unknown;

export type CkChipSize = CkSize;

const SIZES: readonly CkChipSize[] = ['sm', 'md', 'lg', 'xl'];

/** Marks a projected element (usually an `svg`) as the chip's leading icon. It is decorative. */
@Directive({
  selector: '[ckChipIcon]',
  host: { class: 'ck-chip__icon', 'aria-hidden': 'true' },
})
export class CkChipIcon {}

/**
 * A compact toggle button for filters: a native `<button>` with `aria-pressed`. Selected shows a
 * check before the label, so the state is never colour alone. Every native attribute stays
 * yours; `aria-pressed` belongs to the chip.
 */
@Component({
  selector: 'button[ckChip]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'modifierClasses()',
    '[class.ck-chip--selected]': '!!selected()',
    '[class.ck-chip--disabled]': 'disabled()',
    '[attr.aria-pressed]': 'selected() ? "true" : "false"',
    '(click)': 'toggle()',
  },
  imports: [CkIcon],
  template: `
    @if (selected()) {
      <ck-icon class="ck-chip__check" name="check" />
    }
    <ng-content select="[ckChipIcon]" /><span class="ck-chip__label"><ng-content /></span>
  `,
  styleUrl: './chip.css',
})
export class CkChip {
  /** Whether the chip is on. Use `[(selected)]`. Only a click changes it from inside. */
  readonly selected = model(false);
  /** `sm`, `md`, `lg` or `xl`. An unknown value falls back to `sm`. */
  readonly size = input<CkChipSize>('sm');
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly element = inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);

  protected readonly modifierClasses = computed(() => {
    const size = SIZES.includes(this.size()) ? this.size() : 'sm';
    return `ck-chip ck-chip--${size}`;
  });

  /** The consumer's own `disabled` attribute from before the chip wrote one; undefined while the chip writes none. */
  private consumerDisabled: string | null | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // A later `[type]` binding or a static type wins; only a missing type gets the default.
    if (!this.element.hasAttribute('type')) {
      this.renderer.setAttribute(this.element, 'type', 'button');
    }

    // Server-rendered markup already carries the disabled attribute the chip wrote.
    if (this.element.hasAttribute('data-ck-chip-disabled')) {
      this.consumerDisabled = null;
    }

    // Capture phase on the host runs before consumer (click) listeners.
    const blockClick = (event: Event): void => {
      if (this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    for (const type of ['click', 'auxclick']) {
      this.element.addEventListener(type, blockClick, { capture: true });
      destroyRef.onDestroy(() =>
        this.element.removeEventListener(type, blockClick, { capture: true }),
      );
    }

    effect(() => this.writeDisabled(this.disabled()));

    if (typeof ngDevMode !== 'undefined' && ngDevMode && isPlatformBrowser(inject(PLATFORM_ID))) {
      let destroyed = false;
      destroyRef.onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (!destroyed && !hasAccessibleName(this.element, { title: true, text: true })) {
          console.warn(
            '[ckui] ckChip has no accessible name. Give it a label, an aria-label or an aria-labelledby.',
            this.element,
          );
        }
      });
    }
  }

  protected toggle(): void {
    if (this.disabled() || this.element.matches(':disabled')) {
      return;
    }
    this.selected.update((selected) => !selected);
  }

  /** Writes the native `disabled`, and gives the consumer's own value back when it turns off. */
  private writeDisabled(disabled: boolean): void {
    if (disabled) {
      if (this.consumerDisabled === undefined) {
        this.consumerDisabled = this.element.getAttribute('disabled');
        this.renderer.setAttribute(this.element, 'data-ck-chip-disabled', '');
      }
      this.renderer.setAttribute(this.element, 'disabled', '');
    } else if (this.consumerDisabled !== undefined) {
      const previous = this.consumerDisabled;
      this.consumerDisabled = undefined;
      this.renderer.removeAttribute(this.element, 'data-ck-chip-disabled');
      if (previous === null) {
        this.renderer.removeAttribute(this.element, 'disabled');
      } else {
        this.renderer.setAttribute(this.element, 'disabled', previous);
      }
    }
  }
}
