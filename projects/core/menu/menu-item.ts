import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Renderer2,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { AttributeClaim, collapseText, readableText } from '@ckui/core/internal';
import { CK_MENU } from './menu-context';

export type CkMenuItemTone = 'default' | 'danger';

/**
 * One action of a `ck-menu`: a native `<button>` with `role="menuitem"`. It keeps every native
 * attribute and its `(click)`; the menu closes first and the click handler runs after. A disabled
 * item stays focusable (it is announced as dimmed) and does nothing. Never give it the native
 * `disabled` attribute: that would take it out of the arrow-key order.
 */
@Component({
  selector: 'button[ckMenuItem]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-menu-item',
    role: 'menuitem',
    '[class.ck-menu-item--danger]': 'tone() === "danger"',
    '[class.ck-menu-item--disabled]': 'disabled()',
    '(focus)': 'menu?.setActive(this)',
  },
  template: `
    <ng-content select="[ckMenuItemIcon]" />
    <span class="ck-menu-item__label"><ng-content /></span>
  `,
})
export class CkMenuItem {
  /** Dimmed and inert, but still reachable with the arrow keys. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** `danger` draws the text in the danger colour, for an action that destroys something. */
  readonly tone = input<CkMenuItemTone>('default');

  /** @internal */
  readonly element = inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  protected readonly menu = inject(CK_MENU, { optional: true });
  private readonly claims = new Map<string, AttributeClaim>();

  private readonly tabindex = computed(() =>
    this.menu === null || this.menu.activeItem() === this ? '0' : '-1',
  );

  constructor() {
    const element = this.element;
    // The native attribute would take the item out of the tab and arrow order.
    this.renderer.removeAttribute(element, 'disabled');
    if (!element.hasAttribute('type')) {
      this.renderer.setAttribute(element, 'type', 'button');
    }

    // Runs before the consumer's (click): the menu is already closing when their handler starts.
    const onClick = (event: Event): void => {
      if (this.disabled()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.type === 'click') {
        this.menu?.activate();
      }
    };
    for (const type of ['click', 'auxclick']) {
      element.addEventListener(type, onClick, { capture: true });
    }
    inject(DestroyRef).onDestroy(() => {
      for (const type of ['click', 'auxclick']) {
        element.removeEventListener(type, onClick, { capture: true });
      }
    });

    effect(() => {
      this.override('tabindex', this.tabindex());
      this.override('aria-disabled', this.disabled() ? 'true' : null);
    });
  }

  /** The visible text of the item without its icon, whitespace collapsed. */
  get text(): string {
    return collapseText(readableText(this.element.querySelector('.ck-menu-item__label')));
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
