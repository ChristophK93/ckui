import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_RADIO_IMPORTS } from '@ckui/core/radio';
import { SAMPLES } from './radio-samples';

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

interface Zone {
  readonly id: number;
  readonly name: string;
}

@Component({
  selector: 'docs-radio-page',
  imports: [CK_RADIO_IMPORTS, CkButton, RouterLink, FormsModule, ReactiveFormsModule, FormField],
  styleUrl: './radio-page.css',
  templateUrl: './radio-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioPage {
  protected readonly samples = SAMPLES;

  protected readonly unit = signal<string | null>('kg');
  protected readonly view = signal<string | null>('week');
  protected readonly rtlUnit = signal<string | null>('kg');

  protected readonly plan = new FormGroup({
    unit: new FormControl<string | null>(null, Validators.required),
  });
  protected readonly planResult = signal('not saved');

  protected readonly zones: readonly Zone[] = [
    { id: 1, name: 'Endurance' },
    { id: 2, name: 'VO2max' },
    { id: 3, name: 'Tempo' },
  ];
  // A copy, as a server would send it: matched by id, never by identity.
  protected readonly chosenZone = signal<Zone | null>({ id: 2, name: 'VO2max' });
  protected readonly sameZone = (option: Zone, value: Zone): boolean => option.id === value.id;

  protected readonly reactiveUnit = new FormControl<string | null>('lb');
  protected templateUnit: string | null = 'lb';
  protected readonly signalModel = signal<{ unit: string | null }>({ unit: 'lb' });
  protected readonly signalForm = form(this.signalModel, (path) => {
    required(path.unit);
  });

  protected submitPlan(): void {
    this.planResult.set(this.plan.valid ? 'saved' : 'not saved, no unit picked');
  }

  protected readonly groupInputs: readonly InputRow[] = [
    {
      name: 'value',
      type: 'T | null',
      defaultValue: 'null',
      description:
        'The option of the checked radio, two-way with [(value)]. null or undefined means nothing is checked, and so does a value that matches no radio (development builds warn once). A programmatic write is shown as given and is never reported as a change by the user.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description:
        'Size of every radio in the group and of its label. A radio has no size of its own.',
    },
    {
      name: 'required',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Draws the required marker on the label and sets aria-required="true" on the radiogroup. The group itself never validates: your form does.',
    },
    {
      name: 'inline',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Lays the radios in a wrapping row instead of a column. The arrow keys work in both layouts, so there is no orientation.',
    },
    {
      name: 'name',
      type: 'string',
      defaultValue: "'ck-radio-group-N'",
      description:
        'The name every native input of the group shares. It is what makes the browser treat them as one radio group, and what a native form post sends the checked option under. Each group gets its own by default. A fixed name must be unique in its form or document: two groups with the same name uncheck each other natively, without a change event.',
    },
    {
      name: 'compareWith',
      type: '(option: T, value: T) => boolean',
      defaultValue: 'Object.is',
      description:
        'Tells whether a radio’s option is the group’s value, for values that are equal but not the same object. It never gets null.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables every radio in the group. A disabled form control or Signal Forms field does the same.',
    },
    {
      name: 'aria-label',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The accessible name when there is no <label>. It is an input, so it is moved off the host onto the radiogroup element. Bind it as [aria-label].',
    },
    {
      name: 'aria-labelledby',
      type: 'string | null',
      defaultValue: 'null',
      description: 'The ids of the elements that name the group. It wins over the <label>.',
    },
    {
      name: 'aria-describedby',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'More ids that describe the group, listed after its hints and its visible error.',
    },
    {
      name: 'touched',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Becomes true when focus leaves the whole group, not when it moves between its radios. It never goes back to false by itself, so read the form’s own state for styling.',
    },
  ];

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'option',
      type: 'T',
      defaultValue: 'required',
      description:
        'What the group’s value is while this radio is checked, and what a click writes. A string, number or boolean is also the value a native form post sends. null and undefined mean "nothing chosen", so a radio with one of them as its option can never be checked.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Blocks this radio and greys it; the arrow keys skip it. A disabled group or fieldset around it disables it too. A disabled radio that is the group’s value stays checked.',
    },
    {
      name: 'aria-label',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The accessible name for a radio without visible text. It is an input, so it is moved off ck-radio (which has no role) onto the input element. Bind it as [aria-label]. With it, the projected text no longer names the radio.',
    },
    {
      name: 'aria-labelledby',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The ids of the elements that name the input. Moved onto the input element like aria-label, and it wins over the projected text.',
    },
  ];

  protected readonly messageInputs: readonly InputRow[] = [
    {
      name: 'id',
      type: 'string',
      defaultValue: "'ck-hint-N' / 'ck-error-N'",
      description:
        'The id of the hint or error, which the radio or group lists in aria-describedby (an error only while it shows). A static or a bound id both work, and the control follows a change.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'ck-radio-group',
      description:
        'The group, role="radiogroup", holding the value. Its first label child names it; its direct ck-hint and ck-error children describe it.',
    },
    {
      name: 'ck-radio',
      description:
        'One choice. It has no role; the input inside is the radio. It only works inside a ck-radio-group and throws a clear error outside one.',
    },
    {
      name: 'label.ck-radio',
      description:
        'The row. It is a native label, so a click on the text, the hint or the circle checks the radio. It carries the size and disabled modifier classes.',
    },
    {
      name: 'input.ck-radio__input',
      description:
        'A real radio that covers the circle without being drawn. It holds the checked state, the focus, the name and the keyboard behaviour.',
    },
    {
      name: 'span.ck-radio__control',
      description:
        'Holds the input and the circle on top of each other, and is as high as the row without its padding.',
    },
    {
      name: 'span.ck-radio__circle',
      description: 'The ring, hidden from assistive technology. It holds the dot.',
    },
    {
      name: 'span.ck-radio__dot',
      description: 'The dot that scales in when the radio is checked.',
    },
    {
      name: 'span.ck-radio__body',
      description: 'The block next to the circle that holds the label text and the hint.',
    },
    {
      name: 'span.ck-radio__label',
      description:
        'The projected label text, in a block of its own so inline markup keeps its spaces. It names the input.',
    },
    {
      name: 'ck-hint',
      description:
        'Optional help text on a radio. It describes that input, not the group. A radio has no error of its own: the group shows it.',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab', 'Shift+Tab'],
      action:
        'The group is one tab stop: focus enters at the checked radio, or at the first enabled one when none is checked, and leaves to the next control.',
    },
    {
      keys: ['ArrowDown', 'ArrowRight'],
      action:
        'Moves to the next enabled radio and checks it. After the last one it wraps to the first. In left-to-right text ArrowRight is next; see ArrowLeft for right-to-left.',
    },
    {
      keys: ['ArrowUp', 'ArrowLeft'],
      action:
        'Moves to the previous enabled radio and checks it. Before the first one it wraps to the last. In right-to-left text ArrowLeft is the next radio and ArrowRight the previous one, as for native radios; ArrowDown and ArrowUp do not change.',
    },
    {
      keys: ['Space'],
      action: 'Checks the focused radio if it is not checked. Enter does not, as for any radio.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-radio-bg',
      fallback: 'var(--ck-color-control)',
      description: 'Fill of the circle while it is unchecked.',
    },
    {
      name: '--ck-radio-border-color',
      fallback: 'var(--ck-color-border)',
      description:
        'The 2px border of the unchecked circle. Keep it at least 3:1 from the surface the radio sits on.',
    },
    {
      name: '--ck-radio-checked-bg',
      fallback: 'var(--ck-color-primary)',
      description:
        'Fill and border of the circle while it is checked. Keep it at least 3:1 from the surface.',
    },
    {
      name: '--ck-radio-checked-fg',
      fallback: 'var(--ck-color-on-primary)',
      description: 'The dot. Keep it at least 3:1 from the checked fill.',
    },
    {
      name: '--ck-radio-group-gap',
      fallback: 'var(--ck-space-1), and var(--ck-space-4) between inline rows',
      description:
        'Space between the rows of a group. A value you set replaces both the row gap and the column gap between inline rows (whose default is var(--ck-space-4)). The rows are already at least as high as the control height of their size.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-control, --ck-color-border, --ck-color-primary, --ck-color-on-primary, --ck-color-danger-fg, --ck-color-fg, --ck-color-fg-muted, --ck-color-fg-disabled, --ck-color-scheme',
    '--ck-focus-ring, --ck-focus-ring-offset, --ck-duration-normal, --ck-ease-standard',
    '--ck-control-height-*, --ck-control-font-size-*, --ck-font-size-sm, --ck-font-weight-medium, --ck-line-height-tight, --ck-line-height-normal, --ck-space-1, --ck-space-3, --ck-space-4',
  ];
}
