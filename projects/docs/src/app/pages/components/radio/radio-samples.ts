/** A complete component around a template, so every sample compiles as copied. */
function component(
  className: string,
  selector: string,
  template: string,
  options: { core?: string; imports?: string; extraImports?: string; body?: string } = {},
): string {
  const indented = template
    .split('\n')
    .map((line) => (line === '' ? '' : `    ${line}`))
    .join('\n');
  return `import { ${options.core ?? 'Component'} } from '@angular/core';
${options.extraImports ? `${options.extraImports}\n` : ''}import { CK_RADIO_IMPORTS } from '@ckui/core/radio';

@Component({
  selector: '${selector}',
  imports: [${options.imports ?? 'CK_RADIO_IMPORTS'}],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

const UNIT_RADIOS = `  <ck-radio option="kg">Kilograms</ck-radio>
  <ck-radio option="lb">Pounds</ck-radio>
  <ck-radio option="st">Stone</ck-radio>`;

/** A global reset that reaches the radio's native input, its row and the group's label. Unlayered, so it wins. */
export const RESET_BREAKS = `/* An unlayered element reset beats the layered control: the input gets a border and padding. */
input,
label {
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
}`;

/** The same reset, kept away from the radio's parts. */
export const RESET_SCOPED = `/* Keep it off the radio's parts: */
input:not(.ck-radio__input),
label:not(.ck-radio, .ck-radio-group__label) {
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
}

/* Or declare resets in a layer before ckui, so the control's layered rules win over them: */
@layer reset, ckui;

@layer reset {
  input,
  label {
    padding: 0.5rem 1rem;
    border: 1px solid currentColor;
  }
}`;

/** Code shown on the radio page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: component(
    'WeightUnit',
    'app-weight-unit',
    `<ck-radio-group [(value)]="unit">
  <label>Weight unit</label>
  <ck-radio option="kg">Kilograms</ck-radio>
  <ck-radio option="lb">
    Pounds
    <ck-hint>Imperial</ck-hint>
  </ck-radio>
  <ck-radio option="st" disabled>Stone</ck-radio>
  <ck-hint>Used for every lift.</ck-hint>
</ck-radio-group>
<p>Unit: {{ unit() ?? 'none' }}</p>`,
    {
      core: 'Component, signal',
      body: "  protected readonly unit = signal<string | null>('kg');",
    },
  ),
  inline: component(
    'Rhythm',
    'app-rhythm',
    `<ck-radio-group inline [(value)]="view">
  <label>View</label>
  <ck-radio option="day">Day</ck-radio>
  <ck-radio option="week">Week</ck-radio>
  <ck-radio option="month">Month</ck-radio>
</ck-radio-group>`,
    {
      core: 'Component, signal',
      body: "  protected readonly view = signal<string | null>('week');",
    },
  ),
  form: component(
    'WeightForm',
    'app-weight-form',
    `<form [formGroup]="plan" (ngSubmit)="save()">
  <ck-radio-group formControlName="unit" required>
    <label>Weight unit</label>
${UNIT_RADIOS}
    <ck-hint>Used for every lift.</ck-hint>
    <ck-error>Pick a unit.</ck-error>
  </ck-radio-group>
  <button ckButton type="submit">Save</button>
</form>`,
    {
      extraImports: `import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CkButton } from '@ckui/core/button';`,
      imports: 'ReactiveFormsModule, CK_RADIO_IMPORTS, CkButton',
      body: `  protected readonly plan = new FormGroup({
    // null means nothing is checked; Validators.required fails it
    unit: new FormControl<string | null>(null, Validators.required),
  });

  protected save(): void {
    // only runs once the form is valid
  }`,
    },
  ),
  objects: component(
    'ZonePicker',
    'app-zone-picker',
    `<ck-radio-group [(value)]="chosen" [compareWith]="sameZone">
  <label>Zone</label>
  @for (zone of zones; track zone.id) {
    <ck-radio [option]="zone">{{ zone.name }}</ck-radio>
  }
</ck-radio-group>`,
    {
      core: 'Component, signal',
      body: `  protected readonly zones = [
    { id: 1, name: 'Endurance' },
    { id: 2, name: 'VO2max' },
  ];
  // a copy that came from a server: compareWith matches it by id, not by identity
  protected readonly chosen = signal<{ id: number; name: string } | null>({ id: 2, name: 'VO2max' });
  protected readonly sameZone = (option: { id: number }, value: { id: number }) =>
    option.id === value.id;`,
    },
  ),
  reactive: `import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CK_RADIO_IMPORTS } from '@ckui/core/radio';

@Component({
  selector: 'app-unit-reactive',
  imports: [ReactiveFormsModule, CK_RADIO_IMPORTS],
  template: \`
    <ck-radio-group [formControl]="unit" aria-label="Weight unit">
      <ck-radio option="kg">Kilograms</ck-radio>
      <ck-radio option="lb">Pounds</ck-radio>
    </ck-radio-group>
  \`,
})
export class UnitReactive {
  // null counts as nothing checked
  protected readonly unit = new FormControl<string | null>('lb');
}`,
  template: `import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CK_RADIO_IMPORTS } from '@ckui/core/radio';

@Component({
  selector: 'app-unit-model',
  imports: [FormsModule, CK_RADIO_IMPORTS],
  template: \`
    <ck-radio-group [(ngModel)]="unit" aria-label="Weight unit">
      <ck-radio option="kg">Kilograms</ck-radio>
      <ck-radio option="lb">Pounds</ck-radio>
    </ck-radio-group>
  \`,
})
export class UnitModel {
  protected unit: string | null = 'lb';
}`,
  signal: `import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { CK_RADIO_IMPORTS } from '@ckui/core/radio';

@Component({
  selector: 'app-unit-signal',
  imports: [FormField, CK_RADIO_IMPORTS],
  template: \`
    <ck-radio-group [formField]="plan.unit" aria-label="Weight unit">
      <ck-radio option="kg">Kilograms</ck-radio>
      <ck-radio option="lb">Pounds</ck-radio>
      <ck-error>Pick a unit.</ck-error>
    </ck-radio-group>
  \`,
})
export class UnitSignal {
  protected readonly model = signal<{ unit: string | null }>({ unit: 'lb' });
  protected readonly plan = form(this.model, (path) => {
    required(path.unit);
  });
}`,
  sizes: component(
    'Sizes',
    'app-sizes',
    `<ck-radio-group size="sm" aria-label="Small">
  <ck-radio option="a">Small</ck-radio>
</ck-radio-group>
<ck-radio-group size="md" aria-label="Medium">
  <ck-radio option="a">Medium</ck-radio>
</ck-radio-group>
<ck-radio-group size="lg" aria-label="Large">
  <ck-radio option="a">Large</ck-radio>
</ck-radio-group>
<ck-radio-group size="xl" aria-label="Extra large">
  <ck-radio option="a">Extra large</ck-radio>
</ck-radio-group>`,
  ),
  states: component(
    'States',
    'app-states',
    `<!-- one radio blocked, skipped by the arrow keys -->
<ck-radio-group value="kg" aria-label="Weight unit">
  <ck-radio option="kg">Kilograms</ck-radio>
  <ck-radio option="st" disabled>Stone</ck-radio>
</ck-radio-group>

<!-- a disabled group disables every radio in it -->
<ck-radio-group disabled value="lb">
  <label>Weight unit, disabled</label>
${UNIT_RADIOS}
</ck-radio-group>

<!-- a disabled fieldset blocks and styles every radio inside it -->
<fieldset disabled>
  <legend>Locked group</legend>
  <ck-radio-group value="kg" aria-label="Locked unit">
    <ck-radio option="kg">Kilograms</ck-radio>
    <ck-radio option="lb">Pounds</ck-radio>
  </ck-radio-group>
</fieldset>`,
  ),
  rtl: component(
    'ArabicUnit',
    'app-arabic-unit',
    `<div dir="rtl">
  <ck-radio-group [(value)]="unit" aria-label="الوحدة">
    <ck-radio option="kg">كيلوغرام</ck-radio>
    <ck-radio option="lb">رطل</ck-radio>
  </ck-radio-group>
</div>`,
    {
      core: 'Component, signal',
      body: "  protected readonly unit = signal<string | null>('kg');",
    },
  ),
  reset: `${RESET_BREAKS}\n\n${RESET_SCOPED}`,
  tokens: `/* in your app: one group, a whole form or the root */
.settings {
  --ck-radio-bg: var(--ck-color-control);
  --ck-radio-border-color: var(--ck-color-border);
  --ck-radio-checked-bg: var(--ck-color-success);
  --ck-radio-checked-fg: var(--ck-color-on-success);
  --ck-radio-group-gap: var(--ck-space-2);
}`,
};
