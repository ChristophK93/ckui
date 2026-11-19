import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_TABS_IMPORTS } from '@ckui/core/tabs';
import { SAMPLES } from './tabs-samples';

interface InputRow {
  readonly name: string;
  readonly on: string;
  readonly type: string;
  readonly defaultValue: string;
  readonly description: string;
}

interface PartRow {
  readonly name: string;
  readonly description: string;
}

interface KeyRow {
  readonly keys: readonly string[];
  readonly action: string;
}

interface TokenRow {
  readonly name: string;
  readonly fallback: string;
  readonly description: string;
}

@Component({
  selector: 'docs-tabs-page',
  imports: [CK_TABS_IMPORTS, CkButton, RouterLink],
  styleUrl: './tabs-page.css',
  templateUrl: './tabs-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsPage {
  protected readonly samples = SAMPLES;

  protected readonly source = signal<string | null>(null);
  protected readonly view = signal<string | null>('day');
  protected readonly week = signal<number | null>(11);
  protected readonly weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  protected readonly rides = signal(['Sunday', 'Tuesday', 'Thursday']);
  protected readonly ride = signal<string | null>(null);

  protected closeRide(): void {
    const closing = this.ride() ?? this.rides()[0];
    this.rides.update((rides) => rides.filter((item) => item !== closing));
    this.ride.set(null);
  }

  protected resetRides(): void {
    this.rides.set(['Sunday', 'Tuesday', 'Thursday']);
  }

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'value',
      on: 'ck-tabs',
      type: 'T | null',
      defaultValue: 'null',
      description:
        'The value of the selected tab, two-way with [(value)]. null, a value no tab has and the value of a disabled tab show the first enabled tab. That is only reflected: the model is written when the user picks a tab, never for the implicit default. Values are compared with Object.is.',
    },
    {
      name: 'activation',
      on: 'ck-tabs',
      type: "'auto' | 'manual'",
      defaultValue: "'auto'",
      description:
        'auto selects a tab as soon as the arrow keys, Home or End focus it. manual only moves focus; Enter or Space selects. A click selects in both.',
    },
    {
      name: 'size',
      on: 'ck-tabs',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description:
        'Height of every tab and font size of the labels. The height is the control height of that size, so the row lines up with buttons and inputs.',
    },
    {
      name: 'fullWidth',
      on: 'ck-tabs',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Stretches the tabs to share the width of the row equally. A tab whose label needs more room keeps it, and the row scrolls when the labels do not fit together.',
    },
    {
      name: 'value',
      on: 'ck-tab',
      type: 'T',
      defaultValue: 'required',
      description:
        'What the group’s value becomes when this tab is selected, and the key a ck-tab-panel with the same value belongs to. Any type except null; objects are compared by identity.',
    },
    {
      name: 'disabled',
      on: 'ck-tab',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables this tab. It stays visible, cannot be selected or focused and is skipped by the arrow keys.',
    },
    {
      name: 'id',
      on: 'ck-tab',
      type: 'string',
      defaultValue: 'generated',
      description:
        'The id of the tab element. The panel’s aria-labelledby follows it, also when it changes.',
    },
    {
      name: 'value',
      on: 'ck-tab-panel',
      type: 'T | null | undefined',
      defaultValue: 'undefined',
      description:
        'The value of the tab the panel belongs to; the panel is hidden unless that tab is selected. Without it the panel is shared: it is shown for every tab, and every tab points at it.',
    },
    {
      name: 'id',
      on: 'ck-tab-panel',
      type: 'string',
      defaultValue: 'generated',
      description: 'The id of the panel element. The tabs’ aria-controls follow it.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'ck-tabs',
      description:
        'The group and its state. It is not a form control: no value accessor, no touched or dirty state.',
    },
    {
      name: 'ck-tab-list',
      description:
        'The row of tabs, a tablist that needs an aria-label or aria-labelledby. It scrolls sideways when the tabs do not fit and keeps the selected and the focused tab in view.',
    },
    {
      name: 'ck-tab',
      description:
        'One tab, its label is the content. Other attributes (lang, title, class, aria-label) stay on it.',
    },
    {
      name: 'ck-tab-panel',
      description:
        'A tabpanel with tabindex="0". Hidden with the hidden attribute when it is not shown, so its content stays in the DOM.',
    },
    {
      name: 'ckTabContent',
      description:
        'On an ng-template inside a panel: the content is created when the panel is shown and destroyed when it is hidden.',
    },
    {
      name: 'CK_TABS_IMPORTS',
      description: 'All of the above in one array: imports: [CK_TABS_IMPORTS].',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab'],
      action:
        'Moves into the row, onto the selected tab (the first enabled one when none is selected), then to the panel and on. The row is one tab stop; Shift+Tab goes back.',
    },
    {
      keys: ['ArrowRight'],
      action:
        'Moves focus to the next enabled tab, wrapping from the last to the first; with automatic activation it selects it. In right-to-left text it goes to the previous tab.',
    },
    {
      keys: ['ArrowLeft'],
      action:
        'Moves focus to the previous enabled tab, wrapping from the first to the last; with automatic activation it selects it. In right-to-left text it goes to the next tab.',
    },
    {
      keys: ['Home', 'End'],
      action:
        'Moves focus to the first or last enabled tab; with automatic activation it selects it.',
    },
    {
      keys: ['Enter', 'Space'],
      action:
        'Selects the focused tab. With manual activation this is the only way besides a click.',
    },
    {
      keys: ['ArrowUp', 'ArrowDown'],
      action: 'Nothing: the tabs are horizontal, so the keys keep scrolling the page.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-tabs-fg',
      fallback: 'var(--ck-color-fg-muted)',
      description: 'Text colour of the tabs that are not selected.',
    },
    {
      name: '--ck-tabs-fg-selected',
      fallback: 'var(--ck-color-fg)',
      description: 'Text colour of the selected tab.',
    },
    {
      name: '--ck-tabs-indicator',
      fallback: 'var(--ck-color-primary)',
      description:
        'Colour of the underline below the selected tab. Keep it at 3:1 against the page behind the row; the underline is what marks the selected tab besides its weight.',
    },
    {
      name: '--ck-tabs-indicator-thickness',
      fallback: 'var(--ck-space-1)',
      description: 'Thickness of the underline.',
    },
    {
      name: '--ck-tabs-border-color',
      fallback: 'var(--ck-color-border-subtle)',
      description: 'Colour of the 1px line under the whole row.',
    },
    {
      name: '--ck-tabs-gap',
      fallback: '0',
      description: 'Space between the tabs.',
    },
    {
      name: '--ck-tabs-padding-inline',
      fallback: 'var(--ck-control-padding-inline-md), by size',
      description: 'Horizontal padding of each tab, which counts into its width.',
    },
    {
      name: '--ck-tabs-font-weight',
      fallback: 'var(--ck-font-weight-medium)',
      description:
        'Weight of the tabs that are not selected. Set it equal to the selected weight and no tab changes width when selected.',
    },
    {
      name: '--ck-tabs-font-weight-selected',
      fallback: 'var(--ck-font-weight-semibold)',
      description: 'Weight of the selected tab.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-fg, --ck-color-fg-muted, --ck-color-fg-disabled, --ck-color-primary',
    '--ck-color-border-subtle, --ck-color-surface-hover, --ck-color-surface-active, --ck-color-scheme',
    '--ck-control-height-*, --ck-control-padding-inline-*, --ck-control-font-size-*',
    '--ck-focus-ring, --ck-focus-ring-width, --ck-focus-ring-offset',
    '--ck-space-1, --ck-font-weight-medium, --ck-font-weight-semibold, --ck-font-variant-numeric',
    '--ck-line-height-tight, --ck-duration-fast, --ck-ease-standard',
  ];
}
