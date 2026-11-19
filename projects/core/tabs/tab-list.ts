import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  inject,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { hasAccessibleName } from '@ckui/core/internal';
import { CK_TABS_CONTEXT, CkTabRef } from './context';

declare const ngDevMode: unknown;

/** -1 for the previous tab, 1 for the next one, 0 for a key that does not move. */
function stepOf(key: string, rtl: boolean): -1 | 0 | 1 {
  switch (key) {
    case 'ArrowLeft':
      return rtl ? 1 : -1;
    case 'ArrowRight':
      return rtl ? -1 : 1;
    default:
      return 0;
  }
}

/**
 * The row of tabs: `role="tablist"`, one tab stop, Left and Right move between tabs (swapped in
 * right-to-left text), Home and End jump. When the tabs do not fit, the row scrolls sideways and
 * keeps the selected and the focused tab in view. It needs a name: `aria-label` or
 * `aria-labelledby`.
 */
@Component({
  selector: 'ck-tab-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ck-tab-list',
    role: 'tablist',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `<ng-content />`,
})
export class CkTabList {
  private readonly group = inject(CK_TABS_CONTEXT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private destroyed = false;
  private observer: ResizeObserver | null = null;
  private focusedTab: HTMLElement | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.observer?.disconnect();
      this.observer = null;
    });
    afterRenderEffect(() => {
      const tabs = this.group.tabs();
      this.group.selectedTab();
      this.watch(tabs);
      this.rescueFocus();
      this.revealSelected();
    });
    if (typeof ngDevMode !== 'undefined' && ngDevMode && this.browser) {
      afterNextRender(() => {
        if (!this.destroyed && !hasAccessibleName(this.element, { title: false, text: false })) {
          console.warn(
            '[ckui] ck-tab-list has no accessible name. Add an aria-label or aria-labelledby.',
            this.element,
          );
        }
      });
    }
  }

  /** Watches the row and every tab: a resize, a longer label or a late font moves the selected tab. */
  private watch(tabs: readonly CkTabRef[]): void {
    if (!this.browser || this.destroyed) {
      return;
    }
    const Observer = this.element.ownerDocument.defaultView?.ResizeObserver;
    if (Observer === undefined) {
      return;
    }
    this.observer ??= new Observer(() => this.revealCurrent());
    this.observer.disconnect();
    this.observer.observe(this.element);
    for (const tab of tabs) {
      this.observer.observe(tab.element);
    }
  }

  /** A focused tab that was removed leaves focus on the body: move it to the selected tab. */
  private rescueFocus(): void {
    const lost = this.focusedTab;
    if (lost === null || this.destroyed) {
      return;
    }
    const active = this.element.ownerDocument.activeElement;
    if (lost.isConnected) {
      if (active !== lost) {
        this.focusedTab = null;
      }
      return;
    }
    this.focusedTab = null;
    if (active === null || active === this.element.ownerDocument.body) {
      untracked(this.group.selectedTab)?.element.focus();
    }
  }

  private revealSelected(): void {
    const selected = untracked(this.group.selectedTab);
    if (selected !== null) {
      this.reveal(selected.element);
    }
  }

  /** The focused tab when focus is in the row (manual activation may have moved it), else the selected one. */
  private revealCurrent(): void {
    const active = this.element.ownerDocument.activeElement;
    const focused = untracked(this.group.tabs).find((tab) => tab.element === active);
    if (focused !== undefined) {
      this.reveal(focused.element);
    } else {
      this.revealSelected();
    }
  }

  /** Scrolls the row, never the page, so the tab is fully visible. Sizes are divided by any scale. */
  private reveal(tab: HTMLElement): void {
    if (!this.browser || this.destroyed || this.element.offsetWidth === 0) {
      return;
    }
    const list = this.element.getBoundingClientRect();
    const box = tab.getBoundingClientRect();
    const scale = list.width / this.element.offsetWidth;
    const toStart = (box.left - list.left) / scale;
    const toEnd = (box.right - list.right) / scale;
    if (toStart < 0) {
      this.element.scrollLeft += toStart;
    } else if (toEnd > 0) {
      this.element.scrollLeft += toEnd;
    }
  }

  protected onFocusIn(event: FocusEvent): void {
    const target = event.target as Node;
    const tab = this.group.tabs().find((candidate) => candidate.element.contains(target));
    if (tab !== undefined) {
      this.focusedTab = tab.element;
      this.reveal(tab.element);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    // Focus moving to another element is a real departure; a removed tab fires no related target.
    if (event.relatedTarget !== null) {
      this.focusedTab = null;
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target as Node;
    const tabs = this.group.tabs();
    const focused = tabs.find((tab) => tab.element.contains(target));
    if (focused === undefined) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.group.select(focused);
      return;
    }
    const usable = tabs.filter((tab) => !tab.disabled());
    const next = this.targetOf(event.key, focused, usable);
    if (next === null) {
      return;
    }
    event.preventDefault();
    next.element.focus();
    if (this.group.activation() === 'auto') {
      this.group.select(next);
    }
  }

  /** The tab a navigation key leads to, or `null` for a key that does not navigate. */
  private targetOf(key: string, focused: CkTabRef, usable: readonly CkTabRef[]): CkTabRef | null {
    if (usable.length === 0) {
      return null;
    }
    const last = usable.length - 1;
    if (key === 'Home') {
      return usable[0];
    }
    if (key === 'End') {
      return usable[last];
    }
    const step = stepOf(key, this.element.matches(':dir(rtl)'));
    if (step === 0) {
      return null;
    }
    const from = usable.indexOf(focused);
    if (from < 0) {
      return step > 0 ? usable[0] : usable[last];
    }
    return usable[(from + step + usable.length) % usable.length];
  }
}
