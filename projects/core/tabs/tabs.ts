import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
} from '@angular/core';
import { CK_CONFIG, CkSize } from '@ckui/core';
import {
  CK_TABS_CONTEXT,
  CkTabPanelRef,
  CkTabRef,
  CkTabsActivation,
  CkTabsContext,
} from './context';
import { CkTab } from './tab';
import { CkTabPanel } from './tab-panel';

function isValued(panel: CkTabPanelRef): boolean {
  return panel.value() != null;
}

/**
 * Tabs that switch between panels: a `ck-tab-list` of `ck-tab`s and one or more `ck-tab-panel`s.
 * It is not a form control. `value` is the `value` of the selected tab, two-way.
 *
 * A `value` of `null`, or one no enabled tab has, shows the first enabled tab. That is only
 * reflected: the model is written when the user picks a tab, never for the implicit default.
 */
@Component({
  selector: 'ck-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: CK_TABS_CONTEXT, useExisting: forwardRef(() => CkTabs) }],
  host: {
    class: 'ck-tabs',
    '[class]': 'modifierClasses()',
    '[class.ck-tabs--full-width]': 'fullWidth()',
  },
  template: `<ng-content />`,
  styleUrl: './tabs.css',
})
export class CkTabs<T = unknown> implements CkTabsContext {
  /** The value of the selected tab. `null` shows the first enabled tab without writing it back. */
  readonly value = model<T | null>(null);
  /** `auto` selects a tab when the arrow keys focus it; `manual` waits for Enter or Space. */
  readonly activation = input<CkTabsActivation>('auto');
  /** `undefined` uses the size from `provideCkui`. */
  readonly size = input<CkSize | undefined>(undefined);
  /** Stretches the tabs to share the width of the row equally. */
  readonly fullWidth = input(false, { transform: booleanAttribute });

  private readonly config = inject(CK_CONFIG);
  private readonly allTabs = contentChildren(CkTab, { descendants: true });
  private readonly allPanels = contentChildren(CkTabPanel, { descendants: true });

  protected readonly modifierClasses = computed(
    () => `ck-tabs--${this.size() ?? this.config.size}`,
  );

  /** @internal Only this group's own tabs, not those of a group nested in a panel. */
  readonly tabs: Signal<readonly CkTabRef[]> = computed(() =>
    this.allTabs().filter((tab) => tab.group === this),
  );
  private readonly panels: Signal<readonly CkTabPanelRef[]> = computed(() =>
    this.allPanels().filter((panel) => panel.group === this),
  );

  /** @internal */
  readonly selectedTab: Signal<CkTabRef | null> = computed(() => {
    const usable = this.tabs().filter((tab) => !tab.disabled());
    const wanted = this.value();
    const named =
      wanted === null ? undefined : usable.find((tab) => Object.is(tab.current(), wanted));
    return named ?? usable[0] ?? null;
  });

  /** @internal */
  select(tab: CkTabRef): void {
    if (!tab.disabled()) {
      this.value.set(tab.current() as T);
    }
  }

  /** @internal */
  panelIdFor(tab: CkTabRef): string | null {
    const panels = this.panels();
    const own = panels.find((panel) => isValued(panel) && Object.is(panel.value(), tab.current()));
    return (own ?? panels.find((panel) => !isValued(panel)))?.id() ?? null;
  }

  /** @internal */
  tabIdFor(panel: CkTabPanelRef): string | null {
    if (!isValued(panel)) {
      return this.selectedTab()?.id() ?? null;
    }
    return (
      this.tabs()
        .find((tab) => Object.is(tab.current(), panel.value()))
        ?.id() ?? null
    );
  }

  /** @internal */
  isShown(panel: CkTabPanelRef): boolean {
    const selected = this.selectedTab();
    if (selected === null) {
      return false;
    }
    return !isValued(panel) || Object.is(selected.current(), panel.value());
  }

  /** @internal */
  hasTab(value: unknown): boolean {
    return this.tabs().some((tab) => Object.is(tab.current(), value));
  }
}
