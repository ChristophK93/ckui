import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  untracked,
} from '@angular/core';
import { CK_CONFIG, CK_LABELS, CkSize } from '@ckui/core';
import { AttributeClaim, CkAnnouncer, hasAccessibleName } from '@ckui/core/internal';

declare const ngDevMode: unknown;

export type CkButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Styles a native `<button>` or `<a>` as a button. The element keeps every native attribute
 * (`type`, `form`, `aria-*`, `routerLink`); there is no `<ck-button>` element.
 */
@Component({
  selector: 'button[ckButton], a[ckButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-button',
    '[class]': 'modifierClasses()',
    '[class.ck-button--icon-only]': 'iconOnly()',
    '[class.ck-button--loading]': 'loading()',
    '[class.ck-button--disabled]': 'disabled()',
  },
  template: `
    <span class="ck-button__content"><ng-content /></span>
    <span class="ck-button__spinner" aria-hidden="true"></span>
  `,
  styleUrl: './button.css',
})
export class CkButton {
  readonly variant = input<CkButtonVariant>('secondary');
  /** `undefined` uses the size from `provideCkui`. */
  readonly size = input<CkSize | undefined>(undefined);
  readonly iconOnly = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly config = inject(CK_CONFIG);
  private readonly labels = inject(CK_LABELS);
  private readonly announcer = inject(CkAnnouncer);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly isNativeButton = this.element.tagName === 'BUTTON';

  protected readonly modifierClasses = computed(
    () => `ck-button--${this.variant()} ck-button--${this.size() ?? this.config.size}`,
  );

  /** One claim per attribute this component overrides; it gives the consumer's value back. */
  private readonly claims = new Map<string, AttributeClaim>();
  private previousLoading: boolean | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // A later `[type]` binding or a static type wins; only a missing type gets the default.
    if (this.isNativeButton && !this.element.hasAttribute('type')) {
      this.renderer.setAttribute(this.element, 'type', 'button');
    }

    // Capture phase on the host runs before routerLink and consumer (click) listeners.
    const blockClick = (event: Event): void => {
      if (this.loading() || this.disabled()) {
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

    effect(() => {
      const disabled = this.disabled();
      const loading = this.loading();
      const blockedLink = !this.isNativeButton && disabled;
      this.override('disabled', this.isNativeButton && disabled ? '' : null);
      this.override('aria-disabled', loading || blockedLink ? 'true' : null);
      this.override('tabindex', blockedLink ? '-1' : null);
    });

    effect(() => {
      const loading = this.loading();
      const started = this.previousLoading === false && loading;
      this.previousLoading = loading;
      if (started && this.isBrowser) {
        const message = untracked(() => this.labels().loading);
        void this.announcer.announce(message);
      }
    });

    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      let destroyed = false;
      destroyRef.onDestroy(() => (destroyed = true));
      afterNextRender(() => {
        if (
          !destroyed &&
          this.iconOnly() &&
          !hasAccessibleName(this.element, { title: true, text: true })
        ) {
          console.warn(
            '[ckui] ckButton with iconOnly has no accessible name. Add an aria-label, aria-labelledby or title.',
            this.element,
          );
        }
      });
    }
  }

  /** Sets the attribute, or gives the consumer's own value back when `value` is null. */
  private override(name: string, value: string | null): void {
    let claim = this.claims.get(name);
    if (claim === undefined) {
      claim = new AttributeClaim(this.element, name, this.renderer);
      this.claims.set(name, claim);
    }
    claim.apply(value);
  }
}
