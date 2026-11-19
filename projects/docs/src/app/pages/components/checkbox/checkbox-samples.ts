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
${options.extraImports ? `${options.extraImports}\n` : ''}import { CK_CHECKBOX_IMPORTS } from '@ckui/core/checkbox';

@Component({
  selector: '${selector}',
  imports: [${options.imports ?? 'CK_CHECKBOX_IMPORTS'}],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

const ZONE_BOXES = `  <ck-checkbox option="endurance">Endurance</ck-checkbox>
  <ck-checkbox option="vo2">VO2max</ck-checkbox>
  <ck-checkbox option="tempo">Tempo</ck-checkbox>`;

/** A global reset that reaches the checkbox's native input, label and the group's label. Unlayered, so it wins. */
export const RESET_BREAKS = `/* An unlayered element reset beats the layered control: the input gets a border and padding. */
input,
label {
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
}`;

/** The same reset, kept away from the checkbox's parts. */
export const RESET_SCOPED = `/* Keep it off the checkbox's parts: */
input:not(.ck-checkbox__input),
label:not(.ck-checkbox, .ck-checkbox-group__label) {
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

/** Code shown on the checkbox page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: component(
    'SaveAsTemplate',
    'app-save-as-template',
    `<ck-checkbox [(value)]="saveAsTemplate">
  Save as template
  <ck-hint>Shows up under "Mine".</ck-hint>
</ck-checkbox>
<p>Save as template is {{ saveAsTemplate() ? 'on' : 'off' }}</p>`,
    {
      core: 'Component, signal',
      body: '  protected readonly saveAsTemplate = signal(false);',
    },
  ),
  position: component(
    'Position',
    'app-position',
    `<!-- the box first, the text after it (the default) -->
<ck-checkbox [(value)]="audio">Audio cues</ck-checkbox>

<!-- the text first, the box at the end of the row -->
<ck-checkbox labelPosition="start" [(value)]="audio">Audio cues</ck-checkbox>`,
    {
      core: 'Component, signal',
      body: '  protected readonly audio = signal(true);',
    },
  ),
  selectAll: component(
    'SelectRides',
    'app-select-rides',
    `<ck-checkbox
  [value]="all()"
  [indeterminate]="some()"
  (valueChange)="selected.set($event ? rides : [])"
>
  All rides
</ck-checkbox>
<ck-checkbox-group [(value)]="selected">
  <label>Rides</label>
  @for (ride of rides; track ride) {
    <ck-checkbox [option]="ride">{{ ride }}</ck-checkbox>
  }
</ck-checkbox-group>`,
    {
      core: 'Component, computed, signal',
      body: `  protected readonly rides = ['Tempo ride', 'Long ride', 'Recovery spin'];
  protected readonly selected = signal<string[]>(['Long ride']);
  protected readonly all = computed(() => this.selected().length === this.rides.length);
  protected readonly some = computed(() => this.selected().length > 0 && !this.all());`,
    },
  ),
  terms: component(
    'AcceptTerms',
    'app-accept-terms',
    `<form [formGroup]="profile" (ngSubmit)="save()">
  <ck-checkbox formControlName="terms">
    I accept the terms
    <ck-hint>Required to continue.</ck-hint>
    <ck-error>You have to accept the terms.</ck-error>
  </ck-checkbox>
  <button ckButton type="submit">Continue</button>
</form>`,
    {
      extraImports: `import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CkButton } from '@ckui/core/button';`,
      imports: 'ReactiveFormsModule, CK_CHECKBOX_IMPORTS, CkButton',
      body: `  protected readonly profile = new FormGroup({
    terms: new FormControl(false, Validators.requiredTrue),
  });

  protected save(): void {
    // only runs once the form is valid
  }`,
    },
  ),
  group: component(
    'Zones',
    'app-zones',
    `<form [formGroup]="plan" (ngSubmit)="save()">
  <ck-checkbox-group formControlName="zones" required>
    <label>Zones</label>
${ZONE_BOXES}
    <ck-hint>Pick at least one.</ck-hint>
    <ck-error>Pick at least one zone.</ck-error>
  </ck-checkbox-group>
  <button ckButton type="submit">Save</button>
</form>`,
    {
      extraImports: `import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CkButton } from '@ckui/core/button';`,
      imports: 'ReactiveFormsModule, CK_CHECKBOX_IMPORTS, CkButton',
      body: `  protected readonly plan = new FormGroup({
    // Validators.required fails an empty array; Validators.minLength(1) skips it
    zones: new FormControl<string[]>([], Validators.required),
  });

  protected save(): void {
    // only runs once the form is valid
  }`,
    },
  ),
  objects: component(
    'ZoneObjects',
    'app-zone-objects',
    `<ck-checkbox-group [(value)]="chosen">
  <label>Zones</label>
  @for (zone of zones; track zone.id) {
    <ck-checkbox [option]="zone">{{ zone.name }}</ck-checkbox>
  }
</ck-checkbox-group>`,
    {
      core: 'Component, signal',
      body: `  // options are compared with Object.is, so keep the same objects in both lists
  protected readonly zones = [
    { id: 1, name: 'Endurance' },
    { id: 2, name: 'VO2max' },
  ];
  protected readonly chosen = signal([this.zones[1]]);`,
    },
  ),
  reactive: `import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CK_CHECKBOX_IMPORTS } from '@ckui/core/checkbox';

@Component({
  selector: 'app-template-reactive',
  imports: [ReactiveFormsModule, CK_CHECKBOX_IMPORTS],
  template: \`
    <ck-checkbox [formControl]="template">Save as template</ck-checkbox>
    <ck-checkbox-group [formControl]="zones" aria-label="Zones">
      <ck-checkbox option="endurance">Endurance</ck-checkbox>
      <ck-checkbox option="vo2">VO2max</ck-checkbox>
    </ck-checkbox-group>
  \`,
})
export class TemplateReactive {
  // null counts as unchecked, and as an empty array for the group
  protected readonly template = new FormControl<boolean | null>(true);
  protected readonly zones = new FormControl<string[] | null>(['vo2']);
}`,
  template: `import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CK_CHECKBOX_IMPORTS } from '@ckui/core/checkbox';

@Component({
  selector: 'app-template-model',
  imports: [FormsModule, CK_CHECKBOX_IMPORTS],
  template: \`
    <ck-checkbox [(ngModel)]="template">Save as template</ck-checkbox>
    <ck-checkbox-group [(ngModel)]="zones" aria-label="Zones">
      <ck-checkbox option="endurance">Endurance</ck-checkbox>
      <ck-checkbox option="vo2">VO2max</ck-checkbox>
    </ck-checkbox-group>
  \`,
})
export class TemplateModel {
  protected template = true;
  protected zones: string[] = ['vo2'];
}`,
  signal: `import { Component, signal } from '@angular/core';
import { FormField, form, minLength } from '@angular/forms/signals';
import { CK_CHECKBOX_IMPORTS } from '@ckui/core/checkbox';

@Component({
  selector: 'app-template-signal',
  imports: [FormField, CK_CHECKBOX_IMPORTS],
  template: \`
    <ck-checkbox [formField]="plan.template">Save as template</ck-checkbox>
    <ck-checkbox-group [formField]="plan.zones" aria-label="Zones">
      <ck-checkbox option="endurance">Endurance</ck-checkbox>
      <ck-checkbox option="vo2">VO2max</ck-checkbox>
      <ck-error>Pick at least one zone.</ck-error>
    </ck-checkbox-group>
  \`,
})
export class TemplateSignal {
  protected readonly model = signal({ template: true, zones: ['vo2'] });
  protected readonly plan = form(this.model, (path) => {
    minLength(path.zones, 1);
  });
}`,
  sizes: component(
    'Sizes',
    'app-sizes',
    `<ck-checkbox size="sm">Small</ck-checkbox>
<ck-checkbox size="md">Medium</ck-checkbox>
<ck-checkbox size="lg">Large</ck-checkbox>
<ck-checkbox size="xl">Extra large</ck-checkbox>

<!-- a group's size is the default for its checkboxes -->
<ck-checkbox-group size="lg" aria-label="Zones">
  <ck-checkbox option="endurance">Endurance</ck-checkbox>
  <ck-checkbox option="vo2" size="sm">VO2max, set to small</ck-checkbox>
</ck-checkbox-group>`,
  ),
  states: component(
    'States',
    'app-states',
    `<ck-checkbox disabled>Disabled, unchecked</ck-checkbox>
<ck-checkbox disabled [value]="true">Disabled, checked</ck-checkbox>

<!-- a disabled group disables every checkbox in it -->
<ck-checkbox-group disabled [value]="['vo2']">
  <label>Zones</label>
${ZONE_BOXES}
</ck-checkbox-group>

<!-- a disabled fieldset blocks and styles every checkbox inside it -->
<fieldset disabled>
  <legend>Locked group</legend>
  <ck-checkbox [value]="true">Developer tools</ck-checkbox>
</fieldset>`,
  ),
  noText: component(
    'RowCheckbox',
    'app-row-checkbox',
    `<!-- without visible text the checkbox needs a name -->
<ck-checkbox aria-label="Select this ride" [(value)]="selected" />`,
    {
      core: 'Component, signal',
      body: '  protected readonly selected = signal(true);',
    },
  ),
  rtl: component(
    'ArabicRow',
    'app-arabic-row',
    `<div dir="rtl">
  <ck-checkbox [(value)]="saved">حفظ كقالب</ck-checkbox>
</div>`,
    {
      core: 'Component, signal',
      body: '  protected readonly saved = signal(true);',
    },
  ),
  reset: `${RESET_BREAKS}\n\n${RESET_SCOPED}`,
  tokens: `/* in your app: one checkbox, a whole form or the root */
.settings {
  --ck-checkbox-bg: var(--ck-color-control);
  --ck-checkbox-border-color: var(--ck-color-border);
  --ck-checkbox-checked-bg: var(--ck-color-success);
  --ck-checkbox-checked-fg: var(--ck-color-on-success);
  --ck-checkbox-radius: var(--ck-radius-md);
  --ck-checkbox-group-gap: var(--ck-space-2);
}`,
};
