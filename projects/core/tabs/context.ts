import { InjectionToken, Signal } from '@angular/core';

export type CkTabsActivation = 'auto' | 'manual';

/** The part of a `ck-tab` its tabs group reads, so the files need not import each other's classes. */
export interface CkTabRef {
  readonly element: HTMLElement;
  readonly id: Signal<string>;
  /** The tab's value, or an unmatchable symbol while its `value` input is not set yet. */
  readonly current: Signal<unknown>;
  readonly disabled: Signal<boolean>;
  readonly group: CkTabsContext;
}

/** The part of a `ck-tab-panel` its tabs group reads. */
export interface CkTabPanelRef {
  readonly id: Signal<string>;
  /** The value of the tab the panel belongs to; `null` or `undefined` for the shared panel. */
  readonly value: Signal<unknown>;
  readonly group: CkTabsContext;
}

/** What the parts of a tabs group need from it. */
export interface CkTabsContext {
  readonly activation: Signal<CkTabsActivation>;
  /** Only the tabs of this group, not those of a group nested in one of its panels. */
  readonly tabs: Signal<readonly CkTabRef[]>;
  /** The tab that is shown: the one the value names, else the first enabled tab. */
  readonly selectedTab: Signal<CkTabRef | null>;
  select(tab: CkTabRef): void;
  panelIdFor(tab: CkTabRef): string | null;
  tabIdFor(panel: CkTabPanelRef): string | null;
  isShown(panel: CkTabPanelRef): boolean;
  hasTab(value: unknown): boolean;
}

export const CK_TABS_CONTEXT = new InjectionToken<CkTabsContext>('CK_TABS_CONTEXT');
