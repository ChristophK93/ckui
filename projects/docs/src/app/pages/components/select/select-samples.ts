const IMPORT_LINES: Record<string, string> = {
  CK_SELECT_IMPORTS: "import { CK_SELECT_IMPORTS } from '@ckui/core/select';",
  CK_FIELD_IMPORTS: "import { CK_FIELD_IMPORTS } from '@ckui/core/field';",
};

/** A complete component around a template, so every sample compiles as copied. */
function component(
  className: string,
  selector: string,
  template: string,
  options: {
    signals?: boolean;
    field?: boolean;
    body?: string;
    extraCore?: string[];
    extraImports?: string[];
    imports?: string[];
  } = {},
): string {
  const core = ['Component', ...(options.signals ? ['signal'] : []), ...(options.extraCore ?? [])];
  const used = [
    'CK_SELECT_IMPORTS',
    ...(options.field ? ['CK_FIELD_IMPORTS'] : []),
    ...(options.imports ?? []),
  ];
  const indented = template
    .split('\n')
    .map((line) => (line === '' ? '' : `    ${line}`))
    .join('\n');
  const importLines = [
    `import { ${core.join(', ')} } from '@angular/core';`,
    ...(options.extraImports ?? []),
    ...used.map((name) => IMPORT_LINES[name]).filter((line) => line !== undefined),
  ];
  return `${importLines.join('\n')}

@Component({
  selector: '${selector}',
  imports: [${used.filter((name) => name.startsWith('CK_')).join(', ')}${(options.imports ?? [])
    .filter((name) => !name.startsWith('CK_'))
    .map((name) => `, ${name}`)
    .join('')}],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

/** A global reset that reaches the select's parts. Unlayered, so it wins over the layered control. */
export const RESET_BREAKS = `/* An unlayered reset beats the layered control: the trigger loses its border and fill, the options their padding. */
button,
ck-option {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
}`;

/** The same reset, kept away from the select's trigger and options. */
export const RESET_SCOPED = `/* Keep it off the select's parts: */
button:not(.ck-select__trigger),
ck-option:not(.ck-option) {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
}

/* Or declare resets in a layer before ckui, so the control's layered rules win over them: */
@layer reset, ckui;

@layer reset {
  button {
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
  }
}`;

const TWO = '<ck-option value="ftp">% FTP</ck-option><ck-option value="watt">Watts</ck-option>';

const KINDS = `<ck-option value="ftp">% FTP</ck-option>
<ck-option value="watt">Watts</ck-option>
<ck-option value="level">Level</ck-option>
<ck-option value="free" disabled>Free</ck-option>`;

/** Code shown on the select page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: component(
    'IntervalTarget',
    'app-interval-target',
    `<ck-field>
  <label>Target</label>
  <ck-select placeholder="Pick one" [(value)]="kind">
    ${KINDS.split('\n').join('\n    ')}
  </ck-select>
  <ck-hint>How the interval's target is measured.</ck-hint>
</ck-field>`,
    {
      signals: true,
      field: true,
      body: '  protected readonly kind = signal<string | null>(null);',
    },
  ),
  standalone: component(
    'WorkoutKind',
    'app-workout-kind',
    `<ck-select aria-label="Target" placeholder="Pick one" [(value)]="kind">
  ${KINDS.split('\n').join('\n  ')}
</ck-select>`,
    {
      signals: true,
      body: '  protected readonly kind = signal<string | null>(null);',
    },
  ),
  groups: component(
    'WorkoutPicker',
    'app-workout-picker',
    `<ck-select aria-label="Workout" placeholder="Pick a workout" [(value)]="workout">
  <ck-optgroup label="Endurance">
    <ck-option value="zone2">Zone 2</ck-option>
    <ck-option value="long">Long ride</ck-option>
  </ck-optgroup>
  <ck-optgroup label="Intervals">
    <ck-option value="sweet-spot">Sweet spot</ck-option>
    <ck-option value="vo2">VO2 max</ck-option>
    <ck-option value="sprints" disabled>Sprints</ck-option>
  </ck-optgroup>
  <ck-optgroup label="Rest" disabled>
    <ck-option value="recovery">Recovery</ck-option>
  </ck-optgroup>
</ck-select>`,
    {
      signals: true,
      body: '  protected readonly workout = signal<string | null>(null);',
    },
  ),
  rich: component(
    'SessionPicker',
    'app-session-picker',
    `<ck-select aria-label="Session" placeholder="Pick a session" [(value)]="session">
  <!-- Drawn on the button instead of the option's text. -->
  <ng-template ckSelectValue let-option>
    <strong>{{ option.text }}</strong>
  </ng-template>
  @for (item of sessions; track item.id) {
    <ck-option [value]="item.id">
      <span class="name">{{ item.name }}</span>
      <span class="meta">{{ item.minutes }} min · {{ item.watts }} W</span>
    </ck-option>
  }
</ck-select>`,
    {
      signals: true,
      body: `  protected readonly session = signal<string | null>('sweet-spot');
  protected readonly sessions = [
    { id: 'zone2', name: 'Zone 2', minutes: 90, watts: 180 },
    { id: 'sweet-spot', name: 'Sweet spot', minutes: 60, watts: 240 },
    { id: 'vo2', name: 'VO2 max', minutes: 45, watts: 320 },
  ];`,
    },
  ),
  filter: component(
    'CountryPicker',
    'app-country-picker',
    `<ck-select aria-label="Country" filter placeholder="Pick a country" [(value)]="country">
  @for (name of countries; track name) {
    <ck-option [value]="name">{{ name }}</ck-option>
  }
</ck-select>`,
    {
      signals: true,
      body: `  protected readonly country = signal<string | null>(null);
  protected readonly countries = ['Austria', 'Belgium', 'Germany', 'Ghana', 'Türkiye'];`,
    },
  ),
  filterWith: component(
    'CodePicker',
    'app-code-picker',
    `<!-- Find a country by its code as well as by its name. -->
<ck-select aria-label="Country" filter [filterWith]="matches" [(value)]="code">
  @for (country of countries; track country.code) {
    <ck-option [value]="country.code">{{ country.name }}</ck-option>
  }
</ck-select>`,
    {
      signals: true,
      body: `  protected readonly code = signal<string | null>(null);
  protected readonly countries = [
    { code: 'AT', name: 'Austria' },
    { code: 'DE', name: 'Germany' },
    { code: 'TR', name: 'Türkiye' },
  ];
  protected readonly matches = (
    option: { text: string; value(): string },
    query: string,
  ): boolean =>
    option.text.toLowerCase().includes(query.toLowerCase()) ||
    option.value().toLowerCase() === query.toLowerCase();`,
    },
  ),
  disabled: component(
    'LockedPicker',
    'app-locked-picker',
    `<ck-select aria-label="Disabled" disabled [value]="'watt'">
  ${KINDS.split('\n').join('\n  ')}
</ck-select>
<fieldset disabled>
  <ck-select aria-label="In a disabled fieldset" [value]="'watt'">
    ${KINDS.split('\n').join('\n    ')}
  </ck-select>
</fieldset>`,
  ),
  objects: component(
    'ZonePicker',
    'app-zone-picker',
    `<ck-select aria-label="Zone" placeholder="Pick a zone" [compareWith]="sameZone" [(value)]="zone">
  @for (item of zones; track item.id) {
    <ck-option [value]="item">{{ item.name }}</ck-option>
  }
</ck-select>`,
    {
      signals: true,
      body: `  protected readonly zones = [
    { id: 1, name: 'Recovery' },
    { id: 2, name: 'Endurance' },
    { id: 3, name: 'Tempo' },
  ];
  /** A zone loaded from a server is a new object, so compare by id. */
  protected readonly zone = signal<{ id: number; name: string } | null>({ id: 2, name: 'Endurance' });
  protected readonly sameZone = (zone: { id: number }, other: { id: number }): boolean =>
    zone.id === other.id;`,
    },
  ),
  reactive: component(
    'TargetReactive',
    'app-target-reactive',
    `<ck-field>
  <label>Target</label>
  <ck-select placeholder="Pick one" [formControl]="kind">
    ${KINDS.split('\n').join('\n    ')}
  </ck-select>
  <ck-error>Choose how the target is measured.</ck-error>
</ck-field>`,
    {
      field: true,
      extraImports: [
        "import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';",
      ],
      imports: ['ReactiveFormsModule'],
      body: '  protected readonly kind = new FormControl<string | null>(null, Validators.required);',
    },
  ),
  template: component(
    'TargetTemplate',
    'app-target-template',
    `<ck-field>
  <label>Target</label>
  <ck-select placeholder="Pick one" name="kind" required [(ngModel)]="kind">
    ${KINDS.split('\n').join('\n    ')}
  </ck-select>
  <ck-error>Choose how the target is measured.</ck-error>
</ck-field>`,
    {
      field: true,
      extraImports: ["import { FormsModule } from '@angular/forms';"],
      imports: ['FormsModule'],
      body: '  protected kind: string | null = null;',
    },
  ),
  signal: component(
    'TargetSignal',
    'app-target-signal',
    `<ck-field>
  <label>Target</label>
  <ck-select placeholder="Pick one" [formField]="settings.kind">
    ${KINDS.split('\n').join('\n    ')}
  </ck-select>
  <ck-error>Choose how the target is measured.</ck-error>
</ck-field>`,
    {
      signals: true,
      field: true,
      extraImports: ["import { FormField, form, required } from '@angular/forms/signals';"],
      imports: ['FormField'],
      body: `  private readonly model = signal<{ kind: string | null }>({ kind: null });
  protected readonly settings = form(this.model, (path) => {
    required(path.kind);
  });`,
    },
  ),
  sizes: component(
    'SelectSizes',
    'app-select-sizes',
    `<ck-select aria-label="Small" size="sm" [value]="'watt'">${TWO}</ck-select>
<ck-select aria-label="Medium" size="md" [value]="'watt'">${TWO}</ck-select>
<ck-select aria-label="Large" size="lg" [value]="'watt'">${TWO}</ck-select>
<ck-select aria-label="Extra large" size="xl" [value]="'watt'">${TWO}</ck-select>`,
  ),
  reset: RESET_BREAKS,
  tokens: `:root,
[data-ck-theme='light'] {
  /* The trigger of a standalone select. Inside a ck-field the field draws the box. */
  --ck-select-bg: var(--ck-white);
  --ck-select-border-color: var(--ck-gray-600);
  --ck-select-radius: var(--ck-radius-lg);

  /* The list and its options. They are drawn in the overlay container, so set them on :root or the theme, not on a wrapper. */
  --ck-listbox-bg: var(--ck-white);
  --ck-listbox-radius: var(--ck-radius-lg);
  --ck-listbox-shadow: var(--ck-shadow-lg);
  --ck-listbox-max-height: 16rem;
  --ck-option-bg-active: color-mix(in oklch, var(--ck-indigo-600) 12%, transparent);
  --ck-option-bg-selected: var(--ck-indigo-50);
  --ck-option-fg-selected: var(--ck-indigo-800);
}`,
};
