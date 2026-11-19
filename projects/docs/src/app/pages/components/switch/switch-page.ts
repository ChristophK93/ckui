import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_SWITCH_IMPORTS } from '@ckui/core/switch';
import { SAMPLES } from './switch-samples';

interface InputRow {
  readonly name: string;
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
  selector: 'docs-switch-page',
  imports: [CK_SWITCH_IMPORTS, CkButton, RouterLink, FormsModule, ReactiveFormsModule, FormField],
  styleUrl: './switch-page.css',
  templateUrl: './switch-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchPage {
  protected readonly samples = SAMPLES;

  protected readonly autoUpload = signal(false);
  protected readonly hinted = signal(true);
  protected readonly positioned = signal(true);
  protected readonly bare = signal(true);
  protected readonly developerTools = signal(false);
  protected readonly audio = signal(true);
  protected readonly upload = signal(true);

  protected readonly reactiveAudio = new FormControl<boolean | null>(true);
  protected templateAudio = true;
  protected readonly signalModel = signal({ audio: true });
  protected readonly signalForm = form(this.signalModel);

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'value',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'On or off, two-way with [(value)]. null or undefined from a form counts as off. A programmatic write is shown as given and is never reported as a change by the user.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description:
        'Size of the switch and the minimum height of the row: the control height of the size, so at least 44px on a coarse pointer and 60px at xl.',
    },
    {
      name: 'labelPosition',
      type: "'start' | 'end'",
      defaultValue: "'start'",
      description:
        'start puts the text first and the switch at the end of the row; end puts the switch first. Both follow the text direction.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Blocks the switch and greys it. A disabled form control or Signal Forms field disables it too, and so does a disabled fieldset around it.',
    },
    {
      name: 'aria-label',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The accessible name for a switch without visible text. It is an input, so it is moved off ck-switch (which has no role) onto the input element. Bind it as [aria-label], not [attr.aria-label]. With it, the projected text no longer names the switch.',
    },
    {
      name: 'aria-labelledby',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The ids of the elements that name the input. Moved onto the input element like aria-label, and it wins over the projected text.',
    },
    {
      name: 'aria-describedby',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'More ids that describe the input, listed after the hint of ck-hint. Moved onto the input element like aria-label.',
    },
    {
      name: 'touched',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Becomes true when the switch loses focus. It never goes back to false by itself, so read the form’s own state (ng-touched, the field’s touched()) for styling.',
    },
  ];

  protected readonly hintInputs: readonly InputRow[] = [
    {
      name: 'id',
      type: 'string',
      defaultValue: "'ck-hint-N'",
      description:
        'The id of the hint, which the switch lists in aria-describedby. A static or a bound id both work, and the switch follows a change.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'ck-switch',
      description:
        'The control and its form value: a boolean. It has no role; the input inside is the switch.',
    },
    {
      name: 'label.ck-switch',
      description:
        'The row. It is a native label, so a click on the text, the hint or the switch toggles. It carries the size, the label position and the disabled modifier classes.',
    },
    {
      name: 'input.ck-switch__input',
      description:
        'A real checkbox with role="switch" that covers the track without being drawn. It holds the checked state, the focus and the name.',
    },
    {
      name: 'span.ck-switch__track',
      description: 'The track with the thumb inside it, hidden from assistive technology.',
    },
    {
      name: 'span.ck-switch__text',
      description:
        'The projected label text, in a block of its own so inline markup keeps its spaces. It names the input.',
    },
    {
      name: 'ck-hint',
      description:
        'Optional help text under the label. It describes the input and is part of the row.',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab'],
      action: 'Moves focus onto the switch and out again. A disabled switch is skipped.',
    },
    {
      keys: ['Space'],
      action: 'Toggles the switch. Enter does not, as for a checkbox.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-switch-track',
      fallback: 'var(--ck-color-control)',
      description: 'Fill of the track while the switch is off.',
    },
    {
      name: '--ck-switch-track-on',
      fallback: 'var(--ck-color-primary)',
      description:
        'Fill of the track while the switch is on. Keep it at least 3:1 from the off track.',
    },
    {
      name: '--ck-switch-thumb',
      fallback: 'var(--ck-color-fg-muted)',
      description: 'The thumb while the switch is off. Keep it at least 3:1 from the off track.',
    },
    {
      name: '--ck-switch-thumb-on',
      fallback: 'var(--ck-color-on-primary)',
      description: 'The thumb while the switch is on. Keep it at least 3:1 from the on track.',
    },
    {
      name: '--ck-switch-border-color',
      fallback: 'var(--ck-color-control-border)',
      description:
        'The 1px border of the off track. The on track draws its border in its own colour.',
    },
    {
      name: '--ck-switch-radius',
      fallback: 'var(--ck-radius-full)',
      description: 'Corner radius of the track. The thumb stays round.',
    },
    {
      name: '--ck-switch-thumb-gap',
      fallback: '0.1875rem',
      description: 'Space between the thumb and the inside of the track.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-control, --ck-color-control-border, --ck-color-primary, --ck-color-on-primary, --ck-color-fg, --ck-color-fg-muted, --ck-color-fg-disabled, --ck-color-scheme',
    '--ck-focus-ring, --ck-focus-ring-offset, --ck-duration-normal, --ck-ease-standard',
    '--ck-control-height-*, --ck-control-font-size-*, --ck-font-size-sm, --ck-line-height-tight, --ck-line-height-normal, --ck-radius-full, --ck-space-1, --ck-space-3',
  ];
}
