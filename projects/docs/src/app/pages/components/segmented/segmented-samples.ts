const LIST = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
  <path d="M3 4h10M3 8h10M3 12h10" />
</svg>`;

const GRID = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" />
</svg>`;

/** A complete component around a template, so every sample compiles as copied. */
function component(
  className: string,
  selector: string,
  template: string,
  options: { signals?: boolean; body?: string; imports?: string; extra?: string } = {},
): string {
  const core = options.signals ? 'Component, signal' : 'Component';
  const indented = template
    .split('\n')
    .map((line) => (line === '' ? '' : `    ${line}`))
    .join('\n');
  return `import { ${core} } from '@angular/core';
${options.extra ? `${options.extra}\n` : ''}import { CK_SEGMENTED_IMPORTS } from '@ckui/core/segmented';

@Component({
  selector: '${selector}',
  imports: [${options.imports ?? 'CK_SEGMENTED_IMPORTS'}],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

/** Code shown on the segmented page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: component(
    'ViewSwitch',
    'app-view-switch',
    `<ck-segmented aria-label="Calendar view" [(value)]="view">
  <ck-segment value="day">Day</ck-segment>
  <ck-segment value="week">Week</ck-segment>
  <ck-segment value="month">Month</ck-segment>
</ck-segmented>
<p>Showing: {{ view() }}</p>`,
    {
      signals: true,
      body: "  protected readonly view = signal<string | null>('week');",
    },
  ),
  empty: component(
    'Priority',
    'app-priority',
    `<ck-segmented aria-label="Priority" [(value)]="priority">
  <ck-segment value="low">Low</ck-segment>
  <ck-segment value="normal">Normal</ck-segment>
  <ck-segment value="high">High</ck-segment>
</ck-segmented>`,
    {
      signals: true,
      body: '  // null checks nothing and shows no indicator\n  protected readonly priority = signal<string | null>(null);',
    },
  ),
  reactive: `import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CK_SEGMENTED_IMPORTS } from '@ckui/core/segmented';

@Component({
  selector: 'app-view-reactive',
  imports: [ReactiveFormsModule, CK_SEGMENTED_IMPORTS],
  template: \`
    <ck-segmented aria-label="Calendar view" [formControl]="view">
      <ck-segment value="day">Day</ck-segment>
      <ck-segment value="week">Week</ck-segment>
      <ck-segment value="month">Month</ck-segment>
    </ck-segmented>
  \`,
})
export class ViewReactive {
  protected readonly view = new FormControl<string | null>('week');
}`,
  template: `import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CK_SEGMENTED_IMPORTS } from '@ckui/core/segmented';

@Component({
  selector: 'app-view-template',
  imports: [FormsModule, CK_SEGMENTED_IMPORTS],
  template: \`
    <ck-segmented aria-label="Calendar view" [(ngModel)]="view">
      <ck-segment value="day">Day</ck-segment>
      <ck-segment value="week">Week</ck-segment>
      <ck-segment value="month">Month</ck-segment>
    </ck-segmented>
  \`,
})
export class ViewTemplate {
  protected view: string | null = 'week';
}`,
  signal: `import { Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { CK_SEGMENTED_IMPORTS } from '@ckui/core/segmented';

@Component({
  selector: 'app-view-signal',
  imports: [FormField, CK_SEGMENTED_IMPORTS],
  template: \`
    <ck-segmented aria-label="Calendar view" [formField]="settings.view">
      <ck-segment value="day">Day</ck-segment>
      <ck-segment value="week">Week</ck-segment>
      <ck-segment value="month">Month</ck-segment>
    </ck-segmented>
  \`,
})
export class ViewSignal {
  protected readonly model = signal<{ view: string | null }>({ view: 'week' });
  protected readonly settings = form(this.model);
}`,
  sizes: component(
    'Sizes',
    'app-sizes',
    `<ck-segmented aria-label="Small" size="sm" value="week">
  <ck-segment value="day">Day</ck-segment>
  <ck-segment value="week">Week</ck-segment>
</ck-segmented>
<ck-segmented aria-label="Medium" size="md" value="week">
  <ck-segment value="day">Day</ck-segment>
  <ck-segment value="week">Week</ck-segment>
</ck-segmented>
<ck-segmented aria-label="Large" size="lg" value="week">
  <ck-segment value="day">Day</ck-segment>
  <ck-segment value="week">Week</ck-segment>
</ck-segmented>
<ck-segmented aria-label="Extra large" size="xl" value="week">
  <ck-segment value="day">Day</ck-segment>
  <ck-segment value="week">Week</ck-segment>
</ck-segmented>`,
  ),
  icons: component(
    'Layout',
    'app-layout',
    `<ck-segmented aria-label="Layout" value="list">
  <ck-segment value="list">
    ${LIST.split('\n').join('\n    ')}
    List
  </ck-segment>
  <ck-segment value="grid">
    ${GRID.split('\n').join('\n    ')}
    Grid
  </ck-segment>
</ck-segmented>

<ck-segmented aria-label="Layout, icons only" value="list">
  <ck-segment value="list" aria-label="List">
    ${LIST.split('\n').join('\n    ')}
  </ck-segment>
  <ck-segment value="grid" aria-label="Grid">
    ${GRID.split('\n').join('\n    ')}
  </ck-segment>
</ck-segmented>`,
  ),
  fullWidth: component(
    'FullWidth',
    'app-full-width',
    `<ck-segmented aria-label="Calendar view" fullWidth value="week">
  <ck-segment value="day">Day</ck-segment>
  <ck-segment value="week">Week</ck-segment>
  <ck-segment value="month">Month</ck-segment>
</ck-segmented>`,
  ),
  disabled: component(
    'Disabled',
    'app-disabled',
    `<ck-segmented aria-label="Plan" value="free">
  <ck-segment value="free">Free</ck-segment>
  <ck-segment value="team" disabled>Team</ck-segment>
  <ck-segment value="company">Company</ck-segment>
</ck-segmented>

<ck-segmented aria-label="Plan, unavailable" disabled value="free">
  <ck-segment value="free">Free</ck-segment>
  <ck-segment value="team">Team</ck-segment>
</ck-segmented>`,
  ),
  language: component(
    'LanguageSwitch',
    'app-language-switch',
    `<ck-segmented aria-label="Language" [(value)]="language">
  <ck-segment value="de" lang="de">Deutsch</ck-segment>
  <ck-segment value="en" lang="en">English</ck-segment>
</ck-segmented>
<p [attr.lang]="language()">
  {{ language() === 'de' ? 'Guten Tag' : 'Good day' }}
</p>`,
    {
      signals: true,
      body: "  protected readonly language = signal<'de' | 'en'>('en');",
    },
  ),
  reset: `/* A global ring is drawn on the segment itself, next to the control's own. Keep it off the segments: */
:focus-visible:not(.ck-segment) {
  outline: 2px solid currentColor;
}

/* Or declare resets in a layer before ckui, so the control's layered rules win over them: */
@layer reset, ckui;

@layer reset {
  :focus-visible {
    outline: 2px solid currentColor;
  }
}`,
  tokens: `/* in your app: one control, a whole toolbar or the root */
.toolbar {
  --ck-segmented-radius: var(--ck-radius-full);
  --ck-segmented-padding: var(--ck-space-2);
  /* a primary-coloured indicator; keep its text at 4.5:1 */
  --ck-segmented-indicator-bg: var(--ck-color-primary);
  --ck-segmented-indicator-fg: var(--ck-color-on-primary);
}`,
};
