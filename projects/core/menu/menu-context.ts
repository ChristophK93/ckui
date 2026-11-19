import { InjectionToken, Signal, TemplateRef, WritableSignal } from '@angular/core';

/** What `ck-menu` offers the trigger that opened it. Not public API. */
export interface CkMenuView {
  /** The element that takes focus when the menu opens: the first or last enabled item. */
  focusTarget(edge: 'first' | 'last'): HTMLElement | null;
}

/** One open menu, shared by the trigger, the panel around the menu and the menu itself. Not public API. */
export interface CkMenuSession {
  readonly template: TemplateRef<unknown>;
  /** Whether the menu is a bottom sheet; decided when it opened. */
  readonly sheet: boolean;
  /** The trigger's accessible name, as plain text. */
  readonly name: string;
  readonly triggerId: string;
  /** The id of the `ck-menu` once it has rendered, for `aria-controls`. */
  readonly menuId: WritableSignal<string | null>;
  readonly edge: 'first' | 'last';
  menu: CkMenuView | null;
  /** Closes the menu; focus goes back to the trigger. */
  close(): void;
  /** An item was activated: close first, then the consumer's click handler runs. */
  activated(): void;
}

export const CK_MENU_SESSION = new InjectionToken<CkMenuSession>('CK_MENU_SESSION');

/** What `button[ckMenuItem]` asks of the `ck-menu` around it. Not public API. */
export interface CkMenuContext {
  readonly activeItem: Signal<object | null>;
  setActive(item: object): void;
  activate(): void;
}

export const CK_MENU = new InjectionToken<CkMenuContext>('CK_MENU');
