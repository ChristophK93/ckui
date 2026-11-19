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
import { CkSlider } from '@ckui/core/slider';

@Component({
  selector: '${selector}',
  imports: [CkSlider],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

/** A global reset that reaches the slider's parts. Unlayered, so it wins over the layered control. */
export const RESET_BREAKS = `/* An unlayered reset beats the layered control: the rail loses its border and the thumb its ring. */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  border: 0;
}`;

/** The same reset, kept away from the slider's rail and thumb. */
export const RESET_SCOPED = `/* Keep it off the slider's rail and thumb: */
*:not(.ck-slider__rail, .ck-slider__thumb),
*:not(.ck-slider__rail, .ck-slider__thumb)::before,
*:not(.ck-slider__rail, .ck-slider__thumb)::after {
  margin: 0;
  padding: 0;
  border: 0;
}

/* Or declare resets in a layer before ckui, so the control's layered rules win over them: */
@layer reset, ckui;

@layer reset {
  *,
  *::before,
  *::after {
    margin: 0;
    padding: 0;
    border: 0;
  }
}`;

/** Code shown on the slider page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: component(
    'Resistance',
    'app-resistance',
    `<ck-slider aria-label="Resistance level" [min]="1" [max]="24" showValue [(value)]="level" />`,
    {
      signals: true,
      body: '  protected readonly level = signal<number | null>(8);',
    },
  ),
  commit: component(
    'Target',
    'app-target',
    `<!-- value follows the thumb while it moves; valueCommit fires once when the change ends -->
<ck-slider
  aria-label="Target power"
  unit="W"
  showValue
  [min]="0"
  [max]="500"
  [step]="5"
  [(value)]="watts"
  (valueCommit)="send($event)"
/>
<p>Sent to the trainer: {{ sent().join(', ') }}</p>`,
    {
      signals: true,
      body: `  protected readonly watts = signal<number | null>(150);
  protected readonly sent = signal<number[]>([]);

  protected send(watts: number): void {
    // the one place for work that should not run on every step
    this.sent.update((list) => [...list, watts]);
  }`,
    },
  ),
  reactive: `import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CkSlider } from '@ckui/core/slider';

@Component({
  selector: 'app-grade-reactive',
  imports: [ReactiveFormsModule, CkSlider],
  template: \`
    <ck-slider aria-label="Grade" unit="%" showValue [min]="-10" [max]="20" [formControl]="grade" />
  \`,
})
export class GradeReactive {
  protected readonly grade = new FormControl<number | null>(2);
}`,
  template: `import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CkSlider } from '@ckui/core/slider';

@Component({
  selector: 'app-grade-template',
  imports: [FormsModule, CkSlider],
  template: \`
    <ck-slider aria-label="Grade" unit="%" showValue [min]="-10" [max]="20" [(ngModel)]="grade" />
  \`,
})
export class GradeTemplate {
  protected grade: number | null = 2;
}`,
  signal: `import { Component, signal } from '@angular/core';
import { FormField, form, max, min } from '@angular/forms/signals';
import { CkSlider } from '@ckui/core/slider';

@Component({
  selector: 'app-grade-signal',
  imports: [FormField, CkSlider],
  template: \`
    <ck-slider aria-label="Grade" unit="%" showValue [formField]="settings.grade" />
  \`,
})
export class GradeSignal {
  protected readonly model = signal<{ grade: number | null }>({ grade: 2 });
  // min and max come from the schema; the field passes them on to the slider
  protected readonly settings = form(this.model, (path) => {
    min(path.grade, -10);
    max(path.grade, 20);
  });
}`,
  sizes: component(
    'Sizes',
    'app-sizes',
    `<ck-slider aria-label="Small" size="sm" [value]="40" />
<ck-slider aria-label="Medium" size="md" [value]="40" />
<ck-slider aria-label="Large" size="lg" [value]="40" />
<ck-slider aria-label="Extra large" size="xl" [value]="40" />`,
  ),
  unit: component(
    'Grade',
    'app-grade',
    `<!-- the step sets the fraction digits and the grid: -10, -9.5, -9 ... 20 -->
<ck-slider
  aria-label="Grade"
  unit="%"
  showValue
  [min]="-10"
  [max]="20"
  [step]="0.5"
  [(value)]="grade"
/>`,
    {
      signals: true,
      body: '  protected readonly grade = signal<number | null>(4.5);',
    },
  ),
  text: component(
    'Resistance',
    'app-resistance-text',
    `<!-- the same text is read by a screen reader and shown next to the track -->
<ck-slider
  aria-label="Resistance"
  showValue
  [min]="1"
  [max]="24"
  [valueText]="describe"
  [(value)]="level"
/>`,
    {
      signals: true,
      body: `  protected readonly level = signal<number | null>(8);
  protected readonly describe = (level: number): string => \`Level \${level} of 24\`;`,
    },
  ),
  outside: component(
    'Outside',
    'app-outside',
    `<!-- shown at 100, still 150 in the model: nothing is written back -->
<ck-slider aria-label="Cadence" showValue [value]="150" />

<!-- off the step, shown at the nearest one: 33.3 is shown as 33.5 -->
<ck-slider aria-label="Grade" showValue [step]="0.5" [value]="33.3" />

<!-- no value: the thumb sits at min, the fill is empty -->
<ck-slider aria-label="Grade, not set" showValue [min]="-10" [max]="20" [value]="null" />`,
  ),
  states: component(
    'States',
    'app-states',
    `<ck-slider aria-label="Disabled" disabled [value]="40" />

<fieldset disabled>
  <ck-slider aria-label="In a disabled fieldset" [value]="40" />
</fieldset>`,
  ),
  row: component(
    'GradeRow',
    'app-grade-row',
    `<div>
  <span id="grade-label">Grade</span>
  <ck-slider
    aria-labelledby="grade-label"
    unit="%"
    showValue
    size="lg"
    [min]="-10"
    [max]="20"
    [step]="0.5"
    [(value)]="grade"
  />
</div>`,
    {
      signals: true,
      body: '  protected readonly grade = signal<number | null>(2);',
    },
  ),
  reset: `${RESET_BREAKS}\n\n${RESET_SCOPED}`,
  tokens: `/* in your app: one control, a whole toolbar or the root */
.settings {
  --ck-slider-track: var(--ck-color-surface-raised);
  --ck-slider-fill: var(--ck-color-success);
  /* the ring around the thumb keeps it apart from the fill */
  --ck-slider-thumb-bg: var(--ck-color-fg);
  --ck-slider-thumb-border: var(--ck-color-surface-raised);
  --ck-slider-thickness: 0.75rem;
}`,
};
