import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_FIELD_IMPORTS } from '@ckui/core/field';
import { CK_SELECT_IMPORTS } from '@ckui/core/select';
import { SAMPLES } from './select-samples';

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

interface Session {
  readonly id: string;
  readonly name: string;
  readonly minutes: number;
  readonly watts: number;
}

@Component({
  selector: 'docs-select-page',
  imports: [
    CK_SELECT_IMPORTS,
    CK_FIELD_IMPORTS,
    CkButton,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    FormField,
  ],
  styleUrl: './select-page.css',
  templateUrl: './select-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectPage {
  protected readonly samples = SAMPLES;

  protected readonly kind = signal<string | null>(null);
  protected readonly standalone = signal<string | null>('watt');
  protected readonly workout = signal<string | null>(null);
  protected readonly session = signal<string | null>('sweet-spot');
  protected readonly country = signal<string | null>(null);
  protected readonly code = signal<string | null>(null);
  protected readonly zone = signal<Zone | null>({ id: 2, name: 'Endurance' });

  protected readonly sessions: readonly Session[] = [
    { id: 'zone2', name: 'Zone 2', minutes: 90, watts: 180 },
    { id: 'sweet-spot', name: 'Sweet spot', minutes: 60, watts: 240 },
    { id: 'vo2', name: 'VO2 max', minutes: 45, watts: 320 },
  ];

  protected readonly countries: readonly string[] = [
    'Austria',
    'Belgium',
    'Brazil',
    'Canada',
    'Croatia',
    'Denmark',
    'Ecuador',
    'Finland',
    'France',
    'Germany',
    'Ghana',
    'Greece',
    'Hungary',
    'Iceland',
    'Ireland',
    'Italy',
    'Japan',
    'Kenya',
    'Lithuania',
    'Mexico',
    'Netherlands',
    'Norway',
    'Peru',
    'Poland',
    'Portugal',
    'Romania',
    'Spain',
    'Sweden',
    'Switzerland',
    'Türkiye',
  ];

  protected readonly codes: readonly { code: string; name: string }[] = [
    { code: 'AT', name: 'Austria' },
    { code: 'DE', name: 'Germany' },
    { code: 'GH', name: 'Ghana' },
    { code: 'TR', name: 'Türkiye' },
  ];

  protected readonly zones: readonly Zone[] = [
    { id: 1, name: 'Recovery' },
    { id: 2, name: 'Endurance' },
    { id: 3, name: 'Tempo' },
  ];

  protected readonly sameZone = (zone: Zone, other: Zone): boolean => zone.id === other.id;
  protected readonly matchesCode = (
    option: { text: string; value(): string },
    query: string,
  ): boolean =>
    option.text.toLowerCase().includes(query.toLowerCase()) ||
    option.value().toLowerCase() === query.toLowerCase();

  protected readonly reactiveKind = new FormControl<string | null>(null, Validators.required);
  protected templateKind: string | null = null;
  protected readonly signalModel = signal<{ kind: string | null }>({ kind: null });
  protected readonly signalForm = form(this.signalModel, (path) => {
    required(path.kind);
  });

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'value',
      type: 'T | null',
      defaultValue: 'null',
      description:
        'The value of the selected option, two-way with [(value)]. null, or a value that no option has, shows the placeholder; a value that no option has is kept as it is and development builds warn once. Options may load later: the selection follows.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "''",
      description:
        'Shown in a muted colour while nothing is selected. In a field it also lifts the label, so the two do not overlap.',
    },
    {
      name: 'compareWith',
      type: '(optionValue: T, value: T) => boolean',
      defaultValue: 'Object.is',
      description:
        'Decides whether an option is the selected one, for values that are objects loaded again. It is never called with null.',
    },
    {
      name: 'filter',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Puts a search field above the list. The options that do not contain the typed text are hidden.',
    },
    {
      name: 'filterWith',
      type: '(option: CkOption<T>, query: string) => boolean',
      defaultValue: 'contains, in the option text',
      description:
        'Replaces the match of the filter. Given each option and the text as typed; return whether the option stays. option.text is its text and option.value() its value.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size of the field, else provideCkui()',
      description:
        'Height of the button and, on a phone, of the rows in the sheet: 32, 40, 48 and 60px, and at least 44px on a coarse pointer.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables the button. A disabled form control, Signal Forms field or fieldset disables it too, and an open list closes.',
    },
    {
      name: 'aria-label',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The accessible name of the button. It is an input, so it is moved off ck-select (which has no role) onto the button. Bind it as [aria-label], not [attr.aria-label]. The name also titles the sheet on a phone.',
    },
    {
      name: 'aria-labelledby',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The ids of the elements that name the button. Moved onto the button like aria-label.',
    },
    {
      name: 'aria-describedby',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The ids of a hint or an error for the button. Moved onto the button; inside a field the ids of its hint and error are added.',
    },
    {
      name: 'touched',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Becomes true when focus has left the button and the list together; moving into the search field does not count. It never goes back to false by itself, so read the form’s own state (ng-touched, the field’s touched()) for styling.',
    },
  ];

  protected readonly optionInputs: readonly InputRow[] = [
    {
      name: 'value',
      type: 'T',
      defaultValue: 'required',
      description:
        'What the select’s value becomes when the option is picked. Strings, numbers, null and objects all work.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Greys the option out. It cannot be picked, the keys skip it, the filter still shows it and a screen reader reads it as dimmed.',
    },
    {
      name: 'id',
      type: 'string',
      defaultValue: 'ck-option-n',
      description:
        'The id of the option, which aria-activedescendant points at. Replace it for a stable id in tests.',
    },
  ];

  protected readonly groupInputs: readonly InputRow[] = [
    {
      name: 'label',
      type: 'string',
      defaultValue: 'required',
      description:
        'The title above the group’s options. It names the group (role="group") for assistive technology.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables every option in the group.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'ck-select',
      description:
        'The control and its form value. It has no role of its own and fills the width of its container.',
    },
    {
      name: 'button.ck-select__trigger',
      description:
        'The native button with role="combobox": the name target, the one tab stop, and the owner of focus while the list is open (no filter). Inside a field the field’s label points at it.',
    },
    {
      name: 'ck-option',
      description:
        'One choice, with role="option". Its content is the row in the list and, as text, what the button shows. A check mark is added on the selected one.',
    },
    {
      name: 'ck-optgroup',
      description: 'A group of options with a title, role="group".',
    },
    {
      name: 'ng-template[ckSelectValue]',
      description:
        'Draws the selected option on the button instead of its text. The template gets let-option with the value and the text of the option.',
    },
    {
      name: 'div.ck-select-popup',
      description:
        'The list: a popover under the button, or the bottom sheet on a phone. It is drawn in the overlay container, not inside ck-select.',
    },
  ];

  protected readonly closedKeys: readonly KeyRow[] = [
    {
      keys: ['ArrowDown', 'Enter', 'Space', 'Alt+ArrowDown'],
      action: 'Opens the list with the selected option highlighted, or the first one.',
    },
    {
      keys: ['ArrowUp'],
      action: 'Opens the list with the selected option highlighted, or the last one.',
    },
    { keys: ['Home', 'End'], action: 'Opens the list on the first or the last option.' },
    {
      keys: ['a–z, 0–9, …'],
      action:
        'Typeahead without opening: selects the next option whose text starts with what was typed. Letters typed within half a second make one search; the same letter again moves on to the next option with it. A space continues a running search.',
    },
  ];

  protected readonly openKeys: readonly KeyRow[] = [
    {
      keys: ['ArrowDown', 'ArrowUp'],
      action: 'Highlights the next or the previous option. It stops at the ends, it does not wrap.',
    },
    { keys: ['Home', 'End'], action: 'Highlights the first or the last option.' },
    { keys: ['PageUp', 'PageDown'], action: 'Moves the highlight by ten options.' },
    {
      keys: ['Enter', 'Space'],
      action: 'Selects the highlighted option and closes the list.',
    },
    { keys: ['Alt+ArrowUp'], action: 'Selects the highlighted option and closes the list.' },
    {
      keys: ['Escape'],
      action: 'Closes the list without a change. Focus stays on the button.',
    },
    {
      keys: ['Tab'],
      action: 'Selects the highlighted option and moves focus on to the next element.',
    },
    {
      keys: ['a–z, 0–9, …'],
      action: 'Typeahead: moves the highlight to the next option that starts with the typed text.',
    },
  ];

  protected readonly searchKeys: readonly KeyRow[] = [
    {
      keys: ['ArrowDown', 'ArrowUp', 'PageUp', 'PageDown'],
      action: 'Move the highlight in the options that are shown, as in the open list.',
    },
    {
      keys: ['Home', 'End'],
      action: 'Move the caret in the text, as in any text field. They do not move the highlight.',
    },
    { keys: ['Enter'], action: 'Selects the highlighted option and closes the list.' },
    { keys: ['Alt+ArrowUp'], action: 'Selects the highlighted option and closes the list.' },
    {
      keys: ['Escape'],
      action:
        'Closes the list without a change and clears the text. Focus goes back to the button.',
    },
    {
      keys: ['Tab'],
      action: 'Selects the highlighted option, closes the list and moves focus on.',
    },
    { keys: ['Space'], action: 'Types a space. It never selects here.' },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-select-bg',
      fallback: 'var(--ck-color-control)',
      description: 'Fill of the button. Not used in a field, which draws the box.',
    },
    {
      name: '--ck-select-border-color',
      fallback: 'var(--ck-color-control-border)',
      description:
        'Border of the button. Keep it 3:1 against the surface around it. Not used in a field.',
    },
    {
      name: '--ck-select-radius',
      fallback: 'var(--ck-control-radius)',
      description: 'Corner radius of the button. Not used in a field.',
    },
    {
      name: '--ck-listbox-bg',
      fallback: 'var(--ck-color-surface-raised)',
      description: 'Fill of the list and of the bottom sheet.',
    },
    {
      name: '--ck-listbox-radius',
      fallback: 'var(--ck-radius-md)',
      description: 'Corner radius of the popover. The sheet uses the large radius.',
    },
    {
      name: '--ck-listbox-shadow',
      fallback: 'var(--ck-shadow-md), in the sheet var(--ck-shadow-lg)',
      description: 'Shadow of the list.',
    },
    {
      name: '--ck-listbox-max-height',
      fallback: '20rem',
      description:
        'Height at which the popover starts to scroll. The sheet is as tall as it needs.',
    },
    {
      name: '--ck-option-bg-active',
      fallback: 'var(--ck-color-surface-active)',
      description: 'Fill of the highlighted option, a step stronger than the hover fill.',
    },
    {
      name: '--ck-option-bg-selected',
      fallback: 'var(--ck-color-primary-subtle)',
      description: 'Fill of the selected option; a check mark and a heavier weight show it too.',
    },
    {
      name: '--ck-option-fg-selected',
      fallback: 'var(--ck-color-primary-fg)',
      description:
        'Text and check mark of the selected option. Keep it 4.5:1 on the selected fill.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-control, --ck-color-control-border, --ck-color-surface-raised, --ck-color-surface-hover, --ck-color-surface-active, --ck-color-border-subtle, --ck-color-primary-subtle, --ck-color-primary-fg, --ck-color-danger, --ck-color-fg, --ck-color-fg-muted, --ck-color-fg-disabled, --ck-color-scheme',
    '--ck-focus-ring, --ck-focus-ring-offset, --ck-color-focus-ring, --ck-target-min, --ck-radius-md, --ck-radius-xl, --ck-space-1, --ck-space-2, --ck-shadow-md, --ck-shadow-lg',
    '--ck-control-height-*, --ck-control-padding-inline-*, --ck-control-font-size-*, --ck-control-radius, --ck-font-weight-semibold, --ck-font-variant-numeric, --ck-line-height-tight, --ck-duration-fast, --ck-ease-standard',
  ];

  protected touchAll(): void {
    this.reactiveKind.markAsTouched();
  }
}
