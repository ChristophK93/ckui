/** A complete component around a template, so every sample compiles as copied. */
function component(
  className: string,
  selector: string,
  template: string,
  options: { signals?: boolean; body?: string } = {},
): string {
  const core = options.signals ? 'Component, signal' : 'Component';
  const indented = template
    .split('\n')
    .map((line) => (line === '' ? '' : `    ${line}`))
    .join('\n');
  return `import { ${core} } from '@angular/core';
import { CK_TABS_IMPORTS } from '@ckui/core/tabs';

@Component({
  selector: '${selector}',
  imports: [CK_TABS_IMPORTS],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

/** Code shown on the tabs page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: component(
    'LibrarySource',
    'app-library-source',
    `<ck-tabs [(value)]="source">
  <ck-tab-list aria-label="Workout source">
    <ck-tab value="predefined">Predefined</ck-tab>
    <ck-tab value="mine">Mine</ck-tab>
    <ck-tab value="shared">Shared</ck-tab>
  </ck-tab-list>
  <ck-tab-panel>
    <p>One list for the {{ source() ?? 'predefined' }} workouts.</p>
  </ck-tab-panel>
</ck-tabs>`,
    {
      signals: true,
      body: '  // null shows the first tab; the model is written when the user picks one\n  protected readonly source = signal<string | null>(null);',
    },
  ),
  panels: component(
    'Settings',
    'app-settings',
    `<ck-tabs value="audio">
  <ck-tab-list aria-label="Settings">
    <ck-tab value="audio">Audio</ck-tab>
    <ck-tab value="video">Video</ck-tab>
    <ck-tab value="account">Account</ck-tab>
  </ck-tab-list>
  <ck-tab-panel value="audio">Volume and cues.</ck-tab-panel>
  <ck-tab-panel value="video">Resolution and frame rate.</ck-tab-panel>
  <ck-tab-panel value="account">Name, e-mail and password.</ck-tab-panel>
</ck-tabs>`,
  ),
  tabStop: component(
    'WorkoutList',
    'app-workout-list',
    `<ck-tabs [(value)]="source">
  <ck-tab-list aria-label="Workout source">
    <ck-tab value="predefined">Predefined</ck-tab>
    <ck-tab value="mine">Mine</ck-tab>
    <ck-tab value="shared">Shared</ck-tab>
  </ck-tab-list>
  <!-- the content starts with buttons, so Tab goes from the tab straight to the first one -->
  <ck-tab-panel [tabStop]="false">
    <ul>
      @for (workout of workouts(); track workout) {
        <li><button type="button">{{ workout }}</button></li>
      }
    </ul>
  </ck-tab-panel>
</ck-tabs>`,
    {
      signals: true,
      body: "  protected readonly source = signal<string | null>(null);\n  protected readonly workouts = signal(['Full body', 'Upper body', 'Core']);",
    },
  ),
  lazy: component(
    'LazyPanels',
    'app-lazy-panels',
    `<ck-tabs value="notes">
  <ck-tab-list aria-label="Ride">
    <ck-tab value="notes">Notes</ck-tab>
    <ck-tab value="chart">Chart</ck-tab>
  </ck-tab-list>
  <ck-tab-panel value="notes">
    <!-- created once, kept while hidden -->
    <input aria-label="Note" />
  </ck-tab-panel>
  <ck-tab-panel value="chart">
    <!-- created when the tab is shown, destroyed when it is hidden -->
    <ng-template ckTabContent>
      <input aria-label="Annotation" />
    </ng-template>
  </ck-tab-panel>
</ck-tabs>`,
  ),
  manual: component(
    'ManualTabs',
    'app-manual-tabs',
    `<ck-tabs activation="manual" value="day">
  <ck-tab-list aria-label="Calendar view">
    <ck-tab value="day">Day</ck-tab>
    <ck-tab value="week">Week</ck-tab>
    <ck-tab value="month">Month</ck-tab>
  </ck-tab-list>
  <ck-tab-panel>The panel changes on Enter or Space.</ck-tab-panel>
</ck-tabs>`,
  ),
  sizes: component(
    'Sizes',
    'app-sizes',
    `<ck-tabs size="sm" value="a">
  <ck-tab-list aria-label="Small"><ck-tab value="a">First</ck-tab><ck-tab value="b">Second</ck-tab></ck-tab-list>
</ck-tabs>
<ck-tabs size="md" value="a">
  <ck-tab-list aria-label="Medium"><ck-tab value="a">First</ck-tab><ck-tab value="b">Second</ck-tab></ck-tab-list>
</ck-tabs>
<ck-tabs size="lg" value="a">
  <ck-tab-list aria-label="Large"><ck-tab value="a">First</ck-tab><ck-tab value="b">Second</ck-tab></ck-tab-list>
</ck-tabs>
<ck-tabs size="xl" value="a">
  <ck-tab-list aria-label="Extra large"><ck-tab value="a">First</ck-tab><ck-tab value="b">Second</ck-tab></ck-tab-list>
</ck-tabs>`,
  ),
  fullWidth: component(
    'FullWidth',
    'app-full-width',
    `<ck-tabs fullWidth value="mine">
  <ck-tab-list aria-label="Workout source">
    <ck-tab value="predefined">Predefined</ck-tab>
    <ck-tab value="mine">Mine</ck-tab>
    <ck-tab value="shared">Shared</ck-tab>
  </ck-tab-list>
</ck-tabs>`,
  ),
  overflow: component(
    'WeekTabs',
    'app-week-tabs',
    `<!-- in a narrow container the row scrolls and keeps the selected tab in view -->
<ck-tabs [(value)]="week">
  <ck-tab-list aria-label="Training weeks">
    @for (number of weeks; track number) {
      <ck-tab [value]="number">Week {{ number }}</ck-tab>
    }
  </ck-tab-list>
</ck-tabs>`,
    {
      signals: true,
      body: '  protected readonly weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];\n  protected readonly week = signal<number | null>(11);',
    },
  ),
  disabled: component(
    'DisabledTab',
    'app-disabled-tab',
    `<ck-tabs value="free">
  <ck-tab-list aria-label="Plan">
    <ck-tab value="free">Free</ck-tab>
    <ck-tab value="team" disabled>Team</ck-tab>
    <ck-tab value="company">Company</ck-tab>
  </ck-tab-list>
</ck-tabs>`,
  ),
  dynamic: component(
    'DynamicTabs',
    'app-dynamic-tabs',
    `<ck-tabs [(value)]="selected">
  <ck-tab-list aria-label="Open rides">
    @for (ride of rides(); track ride) {
      <ck-tab [value]="ride">{{ ride }}</ck-tab>
    }
  </ck-tab-list>
  <ck-tab-panel>Details of {{ selected() ?? rides()[0] }}.</ck-tab-panel>
</ck-tabs>
<button type="button" (click)="close()">Close the selected ride</button>`,
    {
      signals: true,
      body: `  protected readonly rides = signal(['Sunday', 'Tuesday', 'Thursday']);
  protected readonly selected = signal<string | null>(null);

  protected close(): void {
    const ride = this.selected() ?? this.rides()[0];
    this.rides.update((rides) => rides.filter((item) => item !== ride));
    // the removed tab was the selected one: show the first tab again
    this.selected.set(null);
  }`,
    },
  ),
  reset: `/* A global panel rule beats the hidden attribute: every panel stays on screen. */
ck-tab-panel {
  display: grid;
}

/* Keep it to the shown panel, or put the layout on an element inside the panel: */
ck-tab-panel:not([hidden]) {
  display: grid;
}

/* A global ring is drawn on the tab itself, outside the row, next to the library's own. Keep it off the tabs: */
:focus-visible:not(.ck-tab) {
  outline: 2px solid currentColor;
}

/* Or declare resets in a layer before ckui, so the library's layered rules win over them: */
@layer reset, ckui;

@layer reset {
  ck-tab-panel {
    display: grid;
  }

  :focus-visible {
    outline: 2px solid currentColor;
  }
}`,
  tokens: `/* in your app: one group, a whole page or the root */
.library {
  /* the app's own wayfinding colour for the underline; keep it 3:1 from the page */
  --ck-tabs-indicator: #ffcc00;
  --ck-tabs-indicator-thickness: 4px;
  --ck-tabs-fg: var(--ck-color-fg-muted);
  --ck-tabs-fg-selected: var(--ck-color-fg);
  --ck-tabs-border-color: var(--ck-color-border);
  /* the same weight for every tab, so selecting one never shifts the others */
  --ck-tabs-font-weight: var(--ck-font-weight-semibold);
  --ck-tabs-gap: var(--ck-space-2);
}`,
};
