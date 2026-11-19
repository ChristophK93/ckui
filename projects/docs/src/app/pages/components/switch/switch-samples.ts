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
import { CK_SWITCH_IMPORTS } from '@ckui/core/switch';

@Component({
  selector: '${selector}',
  imports: [CK_SWITCH_IMPORTS],
  template: \`
${indented}
  \`,
})
export class ${className} {${options.body ? `\n${options.body}\n` : ''}}`;
}

/** A global reset that reaches the switch's native input and label. Unlayered, so it wins. */
export const RESET_BREAKS = `/* An unlayered element reset beats the layered control: the input gets a border and padding. */
input,
label {
  padding: 0.5rem 1rem;
  border: 1px solid currentColor;
}`;

/** The same reset, kept away from the switch's parts. */
export const RESET_SCOPED = `/* Keep it off the switch's parts: */
input:not(.ck-switch__input),
label:not(.ck-switch) {
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

/** Code shown on the switch page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: component(
    'AutoUpload',
    'app-auto-upload',
    `<ck-switch [(value)]="autoUpload">Auto-upload</ck-switch>
<p>Auto-upload is {{ autoUpload() ? 'on' : 'off' }}</p>`,
    {
      signals: true,
      body: '  protected readonly autoUpload = signal(false);',
    },
  ),
  hint: component(
    'AutoUploadHint',
    'app-auto-upload-hint',
    `<ck-switch [(value)]="autoUpload">
  Auto-upload
  <ck-switch-hint>Uploads every finished ride to Strava.</ck-switch-hint>
</ck-switch>`,
    {
      signals: true,
      body: '  protected readonly autoUpload = signal(true);',
    },
  ),
  position: component(
    'Position',
    'app-position',
    `<!-- the text first, the switch at the end of the row (the default) -->
<ck-switch [(value)]="audio">Audio cues</ck-switch>

<!-- the switch first, the text after it -->
<ck-switch labelPosition="end" [(value)]="audio">Audio cues</ck-switch>`,
    {
      signals: true,
      body: '  protected readonly audio = signal(true);',
    },
  ),
  reactive: `import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CK_SWITCH_IMPORTS } from '@ckui/core/switch';

@Component({
  selector: 'app-audio-reactive',
  imports: [ReactiveFormsModule, CK_SWITCH_IMPORTS],
  template: \`
    <ck-switch [formControl]="audio">Audio cues</ck-switch>
  \`,
})
export class AudioReactive {
  // null counts as off
  protected readonly audio = new FormControl<boolean | null>(true);
}`,
  template: `import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CK_SWITCH_IMPORTS } from '@ckui/core/switch';

@Component({
  selector: 'app-audio-template',
  imports: [FormsModule, CK_SWITCH_IMPORTS],
  template: \`
    <ck-switch [(ngModel)]="audio">Audio cues</ck-switch>
  \`,
})
export class AudioTemplate {
  protected audio = true;
}`,
  signal: `import { Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { CK_SWITCH_IMPORTS } from '@ckui/core/switch';

@Component({
  selector: 'app-audio-signal',
  imports: [FormField, CK_SWITCH_IMPORTS],
  template: \`
    <ck-switch [formField]="settings.audio">Audio cues</ck-switch>
  \`,
})
export class AudioSignal {
  protected readonly model = signal({ audio: true });
  protected readonly settings = form(this.model);
}`,
  sizes: component(
    'Sizes',
    'app-sizes',
    `<ck-switch size="sm">Small</ck-switch>
<ck-switch size="md">Medium</ck-switch>
<ck-switch size="lg">Large</ck-switch>
<ck-switch size="xl">Extra large</ck-switch>`,
  ),
  states: component(
    'States',
    'app-states',
    `<ck-switch disabled>Disabled, off</ck-switch>
<ck-switch disabled [value]="true">Disabled, on</ck-switch>

<!-- a disabled fieldset blocks and styles every switch inside it -->
<fieldset disabled>
  <legend>Locked group</legend>
  <ck-switch [value]="true">Developer tools</ck-switch>
</fieldset>`,
  ),
  noText: component(
    'IconSwitch',
    'app-icon-switch',
    `<!-- without visible text the switch needs a name -->
<ck-switch aria-label="Audio cues" [(value)]="audio" />`,
    {
      signals: true,
      body: '  protected readonly audio = signal(true);',
    },
  ),
  settings: component(
    'SettingsList',
    'app-settings-list',
    `<ck-switch [(value)]="developerTools">Developer tools</ck-switch>
<ck-switch [(value)]="audio">
  Audio cues
  <ck-switch-hint>Beeps before every interval.</ck-switch-hint>
</ck-switch>
<ck-switch [(value)]="autoUpload">
  Auto-upload
  <ck-switch-hint>Uploads every finished ride to Strava.</ck-switch-hint>
</ck-switch>`,
    {
      signals: true,
      body: '  protected readonly developerTools = signal(false);\n  protected readonly audio = signal(true);\n  protected readonly autoUpload = signal(true);',
    },
  ),
  reset: `${RESET_BREAKS}\n\n${RESET_SCOPED}`,
  tokens: `/* in your app: one switch, a whole settings list or the root */
.settings {
  --ck-switch-track: var(--ck-color-control);
  --ck-switch-track-on: var(--ck-color-success);
  --ck-switch-thumb: var(--ck-color-fg-muted);
  --ck-switch-thumb-on: var(--ck-color-on-success);
  --ck-switch-border-color: var(--ck-color-border);
  --ck-switch-radius: var(--ck-radius-md);
}`,
};
