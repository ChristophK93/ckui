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
import { CkProgress } from '@ckui/core/progress';

@Component({
  selector: '${selector}',
  imports: [CkProgress],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

/** Code shown on the progress page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  determinate: component(
    'Upload',
    'app-upload',
    `<ck-progress aria-label="Upload" [value]="percent()" />
<button type="button" (click)="more()">More</button>`,
    {
      signals: true,
      body: `  protected readonly percent = signal(40);

  protected more(): void {
    // below 0 counts as 0, above max counts as max
    this.percent.update((percent) => percent + 30);
  }`,
    },
  ),
  indeterminate: component(
    'Connecting',
    'app-connecting',
    `<!-- value null: the work has no known end, so there is no aria-valuenow -->
<ck-progress aria-label="Connecting to the trainer" [value]="null" />`,
  ),
  valueText: component(
    'Steps',
    'app-steps',
    `<ck-progress
  aria-label="Workout progress"
  [value]="step()"
  [max]="7"
  [valueText]="'Step ' + step() + ' of 7'"
/>
<button type="button" (click)="next()">Next step</button>`,
    {
      signals: true,
      body: `  protected readonly step = signal(2);

  protected next(): void {
    this.step.update((step) => Math.min(step + 1, 7));
  }`,
    },
  ),
  tokens: `/* in your app: the instance, a whole band or the root */
.step-band {
  background: #ffcc00;
}

.step-band ck-progress {
  --ck-progress-track: rgb(17 17 17 / 0.22);
  --ck-progress-fill: #111;
  --ck-progress-thickness: 5px;
  --ck-progress-radius: 3px;
}`,
  naming: component(
    'NamedProgress',
    'app-named-progress',
    `<!-- a label of its own -->
<ck-progress aria-label="Battery" [value]="80" />

<!-- or the heading that is already on the page -->
<h3 id="sync-heading">Syncing workouts</h3>
<ck-progress aria-labelledby="sync-heading" [value]="25" />`,
  ),
  reset: `/* A rule like this beats the layered bar: the fill leaves the track */
span {
  position: static;
}

/* Scope it away from the bar: */
span:not(.ck-progress__fill) {
  position: static;
}

/* Or declare resets in a layer before ckui, so the bar's layered rules win over them: */
@layer reset, ckui;

@layer reset {
  span {
    position: static;
  }
}`,
};
