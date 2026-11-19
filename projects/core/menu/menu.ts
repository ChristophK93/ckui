import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  LOCALE_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import {
  Typeahead,
  createCkId,
  hasCommandKey,
  isPrintableKey,
  normalizeText,
} from '@ckui/core/internal';
import { CK_MENU, CK_MENU_SESSION, CkMenuContext, CkMenuView } from './menu-context';
import { CkMenuItem } from './menu-item';

/**
 * The list of actions a menu button opens, `role="menu"`. Put it in the template that
 * `[ckMenuTrigger]` gets, and fill it with `button[ckMenuItem]` and `ck-menu-divider`. It is named
 * by the trigger. The arrow keys move through the items and wrap, Home and End jump, and typing a
 * few letters moves to the item that starts with them.
 */
@Component({
  selector: 'ck-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: CK_MENU, useExisting: forwardRef(() => CkMenu) }],
  host: {
    class: 'ck-menu',
    role: 'menu',
    'aria-orientation': 'vertical',
    tabindex: '-1',
    '[attr.id]': 'id()',
    '[attr.aria-labelledby]': 'session?.triggerId ?? null',
    '(keydown)': 'onKeydown($event)',
    '(keyup)': 'onKeyup($event)',
    '(focusin)': 'focusWithin = true',
    '(focusout)': 'onFocusout($event)',
  },
  template: '<ng-content />',
})
export class CkMenu implements CkMenuContext, CkMenuView {
  /** Replace to use your own id; the trigger points `aria-controls` at it while the menu is open. */
  readonly id = input(createCkId('ck-menu'));

  private readonly items = contentChildren(CkMenuItem, { descendants: true });
  protected readonly session = inject(CK_MENU_SESSION, { optional: true });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly locale = inject(LOCALE_ID);
  private readonly typeahead = new Typeahead();
  private readonly focused = signal<CkMenuItem | null>(null);
  /** Space presses an item on keyup; a space typed as part of a search must not also press it. */
  private spaceHandled = false;
  /** Whether focus is inside, to bring it back when the focused item is removed. */
  protected focusWithin = false;

  /** The item with `tabindex="0"`: the one that had focus last, else where the menu starts. */
  readonly activeItem = computed<CkMenuItem | null>(() => {
    const focused = this.focused();
    const items = this.items();
    return focused !== null && items.includes(focused)
      ? focused
      : this.edgeItem(this.session?.edge ?? 'first');
  });

  constructor() {
    if (this.session) {
      this.session.menu = this;
    }
    effect(() => {
      const id = this.id();
      untracked(() => this.session?.menuId.set(id));
    });
    // The focused item was removed: focus would fall to the page, so the menu takes it back.
    effect(() => {
      this.items();
      untracked(() =>
        afterNextRender(
          () => {
            const active = this.document.activeElement;
            if (
              this.focusWithin &&
              (active === null || active === this.document.body) &&
              this.element.isConnected
            ) {
              (this.activeItem()?.element ?? this.element).focus({ preventScroll: true });
            }
          },
          { injector: this.injector },
        ),
      );
    });
  }

  setActive(item: object): void {
    this.focused.set(item as CkMenuItem);
  }

  activate(): void {
    this.typeahead.reset();
    this.session?.activated();
  }

  focusTarget(edge: 'first' | 'last'): HTMLElement | null {
    return this.edgeItem(edge)?.element ?? this.element;
  }

  /** The first or last enabled item; disabled items count only when nothing else is left. */
  private edgeItem(edge: 'first' | 'last'): CkMenuItem | null {
    const items = this.items();
    const ordered = edge === 'first' ? items : [...items].reverse();
    return ordered.find((item) => !item.disabled()) ?? ordered[0] ?? null;
  }

  protected onFocusout(event: FocusEvent): void {
    const entering = event.relatedTarget;
    if (entering instanceof Node && !this.element.contains(entering)) {
      this.focusWithin = false;
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.isComposing || hasCommandKey(event)) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (event.altKey) {
          return;
        }
        this.step(event.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Home':
        this.focusAt(0);
        break;
      case 'End':
        this.focusAt(this.items().length - 1);
        break;
      case 'Tab':
        // A popover closes and the default action moves focus on from the trigger; a sheet keeps its trap.
        if (this.session && !this.session.sheet) {
          this.session.close();
        }
        return;
      case ' ':
        if (!this.typeahead.active()) {
          return;
        }
        this.search(event.key);
        this.spaceHandled = true;
        break;
      default:
        if (!isPrintableKey(event)) {
          return;
        }
        this.search(event.key);
    }
    event.preventDefault();
  }

  /** The keyup of a space that belonged to a search must not press the item. */
  protected onKeyup(event: KeyboardEvent): void {
    if (event.key === ' ' && this.spaceHandled) {
      this.spaceHandled = false;
      event.preventDefault();
    }
  }

  private currentIndex(): number {
    const items = this.items();
    const active = this.document.activeElement;
    const index = items.findIndex((item) => item.element === active);
    return index >= 0 ? index : items.indexOf(this.activeItem() as CkMenuItem);
  }

  private step(direction: 1 | -1): void {
    const count = this.items().length;
    if (count === 0) {
      return;
    }
    const current = this.currentIndex();
    this.focusAt(
      current < 0 ? (direction > 0 ? 0 : count - 1) : (current + direction + count) % count,
    );
  }

  private focusAt(index: number): void {
    this.items()[index]?.element.focus();
  }

  private search(character: string): void {
    const items = this.items();
    const match = this.typeahead.match(
      normalizeText(character, this.locale),
      items.map((item) => normalizeText(item.text, this.locale)),
      this.currentIndex(),
    );
    if (match >= 0) {
      this.focusAt(match);
    }
  }
}
