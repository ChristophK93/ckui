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
import { CkStepper } from '@ckui/core/stepper';

@Component({
  selector: '${selector}',
  imports: [CkStepper],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

/** A global reset that reaches the stepper's native button and input. Unlayered, so it wins. */
export const RESET_BREAKS = `/* An unlayered element reset beats the layered control: the buttons get a border and padding. */
button,
input {
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
}`;

/** The same reset, kept away from the stepper's parts. */
export const RESET_SCOPED = `/* Keep it off the stepper's parts: */
button:not(.ck-stepper__button),
input:not(.ck-stepper__input) {
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
}

/* Or declare resets in a layer before ckui, so the control's layered rules win over them: */
@layer reset, ckui;

@layer reset {
  button,
  input {
    padding: 0.5rem 1rem;
    border: 1px solid currentColor;
  }
}`;

/** Code shown on the stepper page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: component(
    'Resistance',
    'app-resistance',
    `<ck-stepper aria-label="Resistance level" [min]="1" [max]="24" [(value)]="level" />
<p>Level: {{ level() }}</p>`,
    {
      signals: true,
      body: '  protected readonly level = signal<number | null>(8);',
    },
  ),
  reactive: `import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CkStepper } from '@ckui/core/stepper';

@Component({
  selector: 'app-ftp-reactive',
  imports: [ReactiveFormsModule, CkStepper],
  template: \`
    <ck-stepper aria-label="FTP" unit="W" [min]="50" [max]="600" [formControl]="ftp" />
  \`,
})
export class FtpReactive {
  protected readonly ftp = new FormControl<number | null>(250);
}`,
  template: `import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CkStepper } from '@ckui/core/stepper';

@Component({
  selector: 'app-ftp-template',
  imports: [FormsModule, CkStepper],
  template: \`
    <ck-stepper aria-label="FTP" unit="W" [min]="50" [max]="600" [(ngModel)]="ftp" />
  \`,
})
export class FtpTemplate {
  protected ftp: number | null = 250;
}`,
  signal: `import { Component, signal } from '@angular/core';
import { FormField, form, max, min } from '@angular/forms/signals';
import { CkStepper } from '@ckui/core/stepper';

@Component({
  selector: 'app-ftp-signal',
  imports: [FormField, CkStepper],
  template: \`
    <ck-stepper aria-label="FTP" unit="W" [formField]="settings.ftp" />
  \`,
})
export class FtpSignal {
  protected readonly model = signal<{ ftp: number | null }>({ ftp: 250 });
  // min and max come from the schema; the field passes them on to the stepper
  protected readonly settings = form(this.model, (path) => {
    min(path.ftp, 50);
    max(path.ftp, 600);
  });
}`,
  sizes: component(
    'Sizes',
    'app-sizes',
    `<ck-stepper aria-label="Small" size="sm" [value]="10" />
<ck-stepper aria-label="Medium" size="md" [value]="10" />
<ck-stepper aria-label="Large" size="lg" [value]="10" />
<ck-stepper aria-label="Extra large" size="xl" [value]="10" />`,
  ),
  unit: component(
    'Target',
    'app-target',
    `<!-- the unit is part of what a screen reader hears: "250 W" -->
<ck-stepper aria-label="Target power" unit="W" [min]="0" [max]="2000" [step]="5" [(value)]="watts" />`,
    {
      signals: true,
      body: '  protected readonly watts = signal<number | null>(250);',
    },
  ),
  decimals: component(
    'Grade',
    'app-grade',
    `<!-- the step sets the fraction digits and the grid: -2, -1.5, -1 ... 12 -->
<ck-stepper aria-label="Grade" unit="%" [min]="-2" [max]="12" [step]="0.5" [(value)]="grade" />`,
    {
      signals: true,
      body: '  protected readonly grade = signal<number | null>(4.5);',
    },
  ),
  limits: component(
    'Limits',
    'app-limits',
    `<!-- Home and End jump to the limits; a button is disabled at its limit -->
<ck-stepper aria-label="Cadence" unit="rpm" [min]="40" [max]="140" [step]="5" [(value)]="cadence" />

<!-- an empty field is null: arrow or button starts at min, else at 0 -->
<ck-stepper aria-label="Cadence, empty" [min]="40" [(value)]="empty" />`,
    {
      signals: true,
      body: '  protected readonly cadence = signal<number | null>(90);\n  protected readonly empty = signal<number | null>(null);',
    },
  ),
  states: component(
    'States',
    'app-states',
    `<ck-stepper aria-label="Disabled" disabled [value]="5" />
<ck-stepper aria-label="Read only" readonly [value]="5" />`,
  ),
  labels: component(
    'Power',
    'app-power',
    `<!-- "Decrease" and "Increase" are generic; name the buttons for what they change -->
<ck-stepper
  aria-label="FTP"
  decrementLabel="FTP minus 5"
  incrementLabel="FTP plus 5"
  unit="W"
  [step]="5"
  [(value)]="ftp"
/>`,
    {
      signals: true,
      body: '  protected readonly ftp = signal<number | null>(250);',
    },
  ),
  ftp: component(
    'FtpRow',
    'app-ftp-row',
    `<div>
  <span id="ftp-label">Functional threshold power</span>
  <ck-stepper
    aria-labelledby="ftp-label"
    decrementLabel="FTP minus 5"
    incrementLabel="FTP plus 5"
    unit="W"
    size="md"
    [min]="50"
    [max]="600"
    [step]="5"
    [(value)]="ftp"
  />
</div>`,
    {
      signals: true,
      body: '  protected readonly ftp = signal<number | null>(250);',
    },
  ),
  field: `import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { CkStepper } from '@ckui/core/stepper';

@Component({
  selector: 'app-ftp-field',
  imports: [ReactiveFormsModule, CK_FIELD_IMPORTS, CkStepper, CkButton],
  template: \`
    <form [formGroup]="ftpForm" (ngSubmit)="save()">
      <ck-field>
        <label>FTP</label>
        <ck-stepper formControlName="ftp" [min]="50" [max]="600" [step]="5" unit="W" />
        <ck-hint>Your functional threshold power.</ck-hint>
        <ck-error>Enter a value between 50 and 600 W.</ck-error>
      </ck-field>
      <button ckButton type="submit">Save</button>
      <p>Saved: {{ saved() ?? 'nothing yet' }}</p>
    </form>
  \`,
})
export class FtpField {
  protected readonly ftpForm = new FormGroup({
    ftp: new FormControl<number | null>(250, [
      Validators.required,
      Validators.min(50),
      Validators.max(600),
    ]),
  });
  protected readonly saved = signal<number | null>(null);

  protected save(): void {
    if (this.ftpForm.valid) {
      this.saved.set(this.ftpForm.controls.ftp.value);
    }
  }
}`,
  reset: `${RESET_BREAKS}\n\n${RESET_SCOPED}`,
  tokens: `/* in your app: one control, a whole toolbar or the root */
.settings {
  --ck-stepper-radius: var(--ck-radius-full);
  --ck-stepper-bg: var(--ck-color-surface-raised);
  --ck-stepper-border-color: var(--ck-color-border);
  /* a fixed value width instead of one measured from min and max */
  --ck-stepper-value-width: 4.5rem;
}`,
};
