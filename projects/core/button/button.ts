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
import { CkAnnouncer } from '@ckui/core/internal';

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

  /** The consumer's own value of every attribute this component currently overrides. */
  private readonly overridden = new Map<string, string | null>();
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
        if (!destroyed && this.iconOnly() && !this.hasAccessibleName()) {
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
    if (value !== null) {
      if (!this.overridden.has(name)) {
        this.overridden.set(name, this.element.getAttribute(name));
      }
      this.renderer.setAttribute(this.element, name, value);
    } else if (this.overridden.has(name)) {
      const previous = this.overridden.get(name) ?? null;
      this.overridden.delete(name);
      if (previous === null) {
        this.renderer.removeAttribute(this.element, name);
      } else {
        this.renderer.setAttribute(this.element, name, previous);
      }
    }
  }

  private hasAccessibleName(): boolean {
    const element = this.element;
    const attribute = (name: string): boolean => (element.getAttribute(name) ?? '').trim() !== '';
    if (attribute('aria-label') || attribute('title') || visibleText(element) !== '') {
      return true;
    }
    return (element.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .some(
        (id) =>
          id !== '' && (element.ownerDocument.getElementById(id)?.textContent ?? '').trim() !== '',
      );
  }
}

/** Text that is neither in an `aria-hidden` nor in a `hidden` subtree. */
function visibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').trim();
  }
  if (
    node instanceof Element &&
    (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden'))
  ) {
    return '';
  }
  return Array.from(node.childNodes, visibleText).join('');
}
