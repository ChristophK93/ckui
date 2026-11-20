import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormField, form, max, min } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { CkStepper } from '@ckui/core/stepper';
import { SAMPLES } from './stepper-samples';

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
  selector: 'docs-stepper-page',
  imports: [
    CkStepper,
    CkButton,
    CK_FIELD_IMPORTS,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    FormField,
  ],
  styleUrl: './stepper-page.css',
  templateUrl: './stepper-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepperPage {
  protected readonly samples = SAMPLES;

  protected readonly level = signal<number | null>(8);
  protected readonly watts = signal<number | null>(250);
  protected readonly grade = signal<number | null>(4.5);
  protected readonly cadence = signal<number | null>(90);
  protected readonly empty = signal<number | null>(null);
  protected readonly ftp = signal<number | null>(250);
  protected readonly labelled = signal<number | null>(250);

  protected readonly fieldForm = new FormGroup({
    ftp: new FormControl<number | null>(250, [
      Validators.required,
      Validators.min(50),
      Validators.max(600),
    ]),
  });
  protected readonly savedFtp = signal<number | null>(null);

  protected readonly reactiveFtp = new FormControl<number | null>(250);
  protected templateFtp: number | null = 250;
  protected readonly signalModel = signal<{ ftp: number | null }>({ ftp: 250 });
  protected readonly signalForm = form(this.signalModel, (path) => {
    min(path.ftp, 50);
    max(path.ftp, 600);
  });

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'value',
      type: 'number | null',
      defaultValue: 'null',
      description:
        'The value, two-way with [(value)]. null is an empty field. A programmatic write is shown as given, even outside the limits or off the step, and is never reported as a change by the user.',
    },
    {
      name: 'min',
      type: 'number | null',
      defaultValue: 'null',
      description:
        'Smallest value, and the origin of the step grid. Typed numbers and steps are clamped to it. A min above max is a mistake: min wins, the value is pinned to it and development builds warn.',
    },
    {
      name: 'max',
      type: 'number | null',
      defaultValue: 'null',
      description:
        'Largest value. A max that is not on the grid counts as the last grid point below it.',
    },
    {
      name: 'step',
      type: 'number | null',
      defaultValue: '1',
      description:
        'Distance between values, counted from min (else from 0). It also sets the fraction digits that are shown: 0.5 shows one. A step that is 0, negative or not a number uses 1 and development builds warn.',
    },
    {
      name: 'largeStep',
      type: 'number | null',
      defaultValue: '10 × step',
      description: 'What Page Up and Page Down move by.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "''",
      description:
        'Text after the value, such as W. It is drawn next to the value but hidden from assistive technology, which reads it as part of aria-valuetext ("250 W").',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description:
        'Height of the control. The buttons are squares of that height, so each is at least 44px on a coarse pointer and 60px at xl.',
    },
    {
      name: 'readonly',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'The value can be read and focused, but neither typed nor stepped. The buttons are disabled.',
    },
    {
      name: 'fullWidth',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Fills the container: the minus button at the start, the plus button at the end, value and unit centred between. It can shrink inside a grid or flex cell. Inside a ck-field the stepper always fills the field.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables the input and both buttons. A disabled form control or Signal Forms field disables it too.',
    },
    {
      name: 'decrementLabel',
      type: 'string',
      defaultValue: "''",
      description:
        'The accessible name of the minus button for this instance, such as "FTP minus 5". Without it the button is called "Decrease" (the decrement string of the labels).',
    },
    {
      name: 'incrementLabel',
      type: 'string',
      defaultValue: "''",
      description:
        'The accessible name of the plus button for this instance. Without it the button is called "Increase".',
    },
    {
      name: 'aria-label',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The accessible name of the input. It is an input, so it is moved off ck-stepper (which has no role) onto the input element. Bind it as [aria-label], not [attr.aria-label].',
    },
    {
      name: 'aria-labelledby',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The ids of the elements that name the input. Moved onto the input element like aria-label. A wrapping <label> works as well.',
    },
    {
      name: 'aria-describedby',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The ids of a hint or an error for the input. Moved onto the input element like aria-label, so a screen reader reads it with the value.',
    },
    {
      name: 'touched',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Becomes true when focus leaves the whole control, or after a button press ends. It never goes back to false by itself, so read the form’s own state (ng-touched, the field’s touched()) for styling.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'ck-stepper',
      description:
        'The control and its form value: a number or null. It has no role; the input inside is the spinbutton.',
    },
    {
      name: 'input.ck-stepper__input',
      description:
        'The value, a real text input with role="spinbutton". Its inputmode is "decimal", and "text" when min is below 0 so the keyboard has a minus sign. It is the only tab stop.',
    },
    {
      name: 'button.ck-stepper__button',
      description:
        'The minus and plus buttons. They are native buttons outside the tab order (tabindex="-1"): keyboard users use the arrow keys, pointer users tap, and a screen reader can still activate them.',
    },
    {
      name: 'ck-stepper__unit',
      description: 'The unit text, when set.',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab'],
      action:
        'Moves into the value and out again with the next press. The buttons are not tab stops.',
    },
    {
      keys: ['ArrowUp'],
      action:
        'Adds one step. With text typed but not committed it steps from the typed number. With no value it starts at min, else at 0. A value that is off the grid moves to the next grid point.',
    },
    {
      keys: ['ArrowDown'],
      action: 'Subtracts one step, in the same way.',
    },
    {
      keys: ['PageUp', 'PageDown'],
      action: 'Adds or subtracts largeStep (10 steps by default).',
    },
    {
      keys: ['Home', 'End'],
      action:
        'Jumps to min or max, when it is set. Without that limit the key moves the text cursor as in any input.',
    },
    {
      keys: ['Enter'],
      action:
        'Commits what was typed: the number is parsed, clamped to min and max and snapped to the step. Text that is not a number goes back to the last value, an empty field becomes null. A form around the stepper still submits.',
    },
    {
      keys: ['0-9', '.', ',', '-'],
      action:
        'Type a number. Both the decimal point and the comma are read as a decimal mark; the locale of the page (LOCALE_ID) decides how the value is shown, and whether 1.250 means one thousand two hundred fifty. Typed text is also committed when focus leaves the input.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-stepper-bg',
      fallback: 'var(--ck-color-control)',
      description: 'Fill of the whole control.',
    },
    {
      name: '--ck-stepper-border-color',
      fallback: 'var(--ck-color-control-border)',
      description: 'The 1px border of the control.',
    },
    {
      name: '--ck-stepper-radius',
      fallback: 'var(--ck-control-radius)',
      description: 'Corner radius. The buttons round their outer corners to match.',
    },
    {
      name: '--ck-stepper-value-width',
      fallback: 'the width of the formatted min and max',
      description:
        'Width of the value field. Without it the field is as wide as the longest of the formatted limits (else the value, at least three characters), so the control does not change width while the value does. Set it for a fixed width.',
    },
    {
      name: '--ck-stepper-button-width',
      fallback: 'the control height',
      description:
        'Width of each button. By default they are squares of the control height; a wider button keeps the full height as hit area.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-control, --ck-color-control-border, --ck-color-fg, --ck-color-fg-muted, --ck-color-fg-disabled, --ck-color-scheme',
    '--ck-color-surface-hover, --ck-color-surface-active, --ck-focus-ring, --ck-focus-ring-offset',
    '--ck-control-height-*, --ck-control-font-size-*, --ck-control-radius, --ck-font-weight-bold, --ck-font-variant-numeric, --ck-line-height-tight',
  ];

  protected saveField(): void {
    if (this.fieldForm.valid) {
      this.savedFtp.set(this.fieldForm.controls.ftp.value);
    }
  }

  protected clear(): void {
    this.empty.set(null);
  }
}
