import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormField, form, minLength } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_CHECKBOX_IMPORTS } from '@ckui/core/checkbox';
import { SAMPLES } from './checkbox-samples';

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
  selector: 'docs-checkbox-page',
  imports: [CK_CHECKBOX_IMPORTS, CkButton, RouterLink, FormsModule, ReactiveFormsModule, FormField],
  styleUrl: './checkbox-page.css',
  templateUrl: './checkbox-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxPage {
  protected readonly samples = SAMPLES;

  protected readonly saveAsTemplate = signal(false);
  protected readonly positioned = signal(true);
  protected readonly bare = signal(true);
  protected readonly saved = signal(true);
  protected readonly developerTools = signal(false);
  protected readonly audio = signal(true);
  protected readonly upload = signal(true);

  protected readonly rides = ['Tempo ride', 'Long ride', 'Recovery spin'];
  protected readonly selectedRides = signal<string[]>(['Long ride']);
  protected readonly allRides = computed(() => this.selectedRides().length === this.rides.length);
  protected readonly someRides = computed(
    () => this.selectedRides().length > 0 && !this.allRides(),
  );

  protected readonly profile = new FormGroup({
    terms: new FormControl(false, Validators.requiredTrue),
  });
  protected readonly termsResult = signal('not sent');

  protected readonly plan = new FormGroup({
    zones: new FormControl<string[]>([], Validators.required),
  });
  protected readonly planResult = signal('not saved');

  protected readonly zoneObjects: readonly Zone[] = [
    { id: 1, name: 'Endurance' },
    { id: 2, name: 'VO2max' },
    { id: 3, name: 'Tempo' },
  ];
  protected readonly chosenZones = signal<Zone[]>([this.zoneObjects[1]]);

  protected readonly reactiveTemplate = new FormControl<boolean | null>(true);
  protected readonly reactiveZones = new FormControl<string[] | null>(['vo2']);
  protected templateTemplate = true;
  protected templateZones: string[] = ['vo2'];
  protected readonly signalModel = signal({ template: true, zones: ['vo2'] });
  protected readonly signalForm = form(this.signalModel, (path) => {
    minLength(path.zones, 1);
  });

  protected setAllRides(checked: boolean): void {
    this.selectedRides.set(checked ? [...this.rides] : []);
  }

  protected submitTerms(): void {
    this.termsResult.set(this.profile.valid ? 'sent' : 'not sent, the terms are not accepted');
  }

  protected submitPlan(): void {
    this.planResult.set(this.plan.valid ? 'saved' : 'not saved, no zone picked');
  }

  protected zoneNames(zones: readonly Zone[]): string {
    return zones.map((zone) => zone.name).join(', ') || 'none';
  }

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'value',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Checked or not, two-way with [(value)]. null or undefined from a form counts as unchecked. A programmatic write is shown as given and is never reported as a change by the user. Not used inside a ck-checkbox-group: the group holds the state.',
    },
    {
      name: 'indeterminate',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'The mixed state, for a "select all" while only some items are on. It sets the native indeterminate property, so assistive technology reports it as mixed. A click clears it (it is a model, so [(indeterminate)] follows) and checks the box.',
    },
    {
      name: 'option',
      type: 'unknown',
      defaultValue: 'none',
      description:
        'Inside a ck-checkbox-group: the value this checkbox adds to the group’s array while it is checked. Compared with Object.is. A checkbox in a group without an option can never be checked, and development builds warn.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size of its group, else the size from provideCkui()',
      description:
        'Size of the box and the minimum height of the row: the control height of the size, so at least 44px on a coarse pointer and 60px at xl.',
    },
    {
      name: 'labelPosition',
      type: "'start' | 'end'",
      defaultValue: "'end'",
      description:
        'end puts the box first; start puts the text first and the box at the end of the row. Both follow the text direction.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Blocks the checkbox and greys it. A disabled form control or Signal Forms field disables it too, and so does a disabled group or fieldset around it.',
    },
    {
      name: 'aria-label',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The accessible name for a checkbox without visible text. It is an input, so it is moved off ck-checkbox (which has no role) onto the input element. Bind it as [aria-label], not [attr.aria-label]. With it, the projected text no longer names the checkbox.',
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
        'More ids that describe the input, listed after the hint and the visible error. Moved onto the input element like aria-label.',
    },
    {
      name: 'touched',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Becomes true when the checkbox loses focus (a checkbox in a group leaves that to the group). It never goes back to false by itself, so read the form’s own state (ng-touched, the field’s touched()) for styling.',
    },
  ];

  protected readonly groupInputs: readonly InputRow[] = [
    {
      name: 'value',
      type: 'T[]',
      defaultValue: '[]',
      description:
        'The options that are checked, two-way with [(value)]. A user change writes a new array in the order of the checkboxes in the page, whatever order they were clicked in. Values no checkbox has as its option stay, at the end, and development builds warn. null, undefined or a non-array from a form counts as empty.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description: 'The default size of the checkboxes in the group, and the size of its label.',
    },
    {
      name: 'required',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Draws the required marker on the label. The group itself never validates: your form does. A group is not allowed aria-required, so there is none.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables every checkbox in the group. A disabled form control or Signal Forms field does the same.',
    },
    {
      name: 'aria-label',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The accessible name when there is no <label>. It is an input, so it is moved off the host onto the group element. Bind it as [aria-label].',
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
        'Becomes true when focus leaves the whole group, not when it moves between its checkboxes. It never goes back to false by itself.',
    },
  ];

  protected readonly messageInputs: readonly InputRow[] = [
    {
      name: 'id',
      type: 'string',
      defaultValue: "'ck-hint-N' / 'ck-error-N'",
      description:
        'The id of the hint or error, which the checkbox or group lists in aria-describedby (an error only while it shows). A static or a bound id both work, and the control follows a change.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'ck-checkbox',
      description:
        'The control and its form value: a boolean. It has no role; the input inside is the checkbox.',
    },
    {
      name: 'label.ck-checkbox',
      description:
        'The row. It is a native label, so a click on the text, the hint or the box toggles. It carries the size, the label position and the disabled modifier classes.',
    },
    {
      name: 'input.ck-checkbox__input',
      description:
        'A real checkbox that covers the box without being drawn. It holds the checked and mixed state, the focus and the name.',
    },
    {
      name: 'span.ck-checkbox__box',
      description:
        'The box with a tick or a dash inside it, hidden from assistive technology. The tick means checked, the dash mixed.',
    },
    {
      name: 'span.ck-checkbox__text',
      description:
        'The projected label text, in a block of its own so inline markup keeps its spaces. It names the input.',
    },
    {
      name: 'ck-hint, ck-error',
      description:
        'Optional help text and, on a checkbox with a form control of its own, an error. The hint describes the input; the error joins the description while it shows.',
    },
    {
      name: 'ck-checkbox-group',
      description:
        'The group, role="group", holding the array value. Its first label child names it; its direct ck-hint and ck-error children describe it.',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab'],
      action:
        'Moves focus to the next checkbox and out again. Each checkbox of a group is its own tab stop. A disabled checkbox is skipped.',
    },
    {
      keys: ['Space'],
      action: 'Toggles the focused checkbox. Enter does not, as for any checkbox.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-checkbox-bg',
      fallback: 'var(--ck-color-control)',
      description: 'Fill of the box while it is unchecked.',
    },
    {
      name: '--ck-checkbox-border-color',
      fallback: 'var(--ck-color-border)',
      description:
        'The 2px border of the unchecked box. Keep it at least 3:1 from the surface the checkbox sits on.',
    },
    {
      name: '--ck-checkbox-checked-bg',
      fallback: 'var(--ck-color-primary)',
      description:
        'Fill and border of the box while it is checked or mixed. Keep it at least 3:1 from the surface.',
    },
    {
      name: '--ck-checkbox-checked-fg',
      fallback: 'var(--ck-color-on-primary)',
      description: 'The tick or dash. Keep it at least 3:1 from the checked fill.',
    },
    {
      name: '--ck-checkbox-radius',
      fallback: 'var(--ck-radius-sm)',
      description: 'Corner radius of the box.',
    },
    {
      name: '--ck-checkbox-group-gap',
      fallback: 'var(--ck-space-1)',
      description: 'Space between the rows of a group. The rows are already at least 32px high.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-control, --ck-color-border, --ck-color-primary, --ck-color-on-primary, --ck-color-danger-fg, --ck-color-fg, --ck-color-fg-muted, --ck-color-fg-disabled, --ck-color-scheme',
    '--ck-focus-ring, --ck-focus-ring-offset, --ck-duration-normal, --ck-ease-standard',
    '--ck-control-height-*, --ck-control-font-size-*, --ck-font-size-sm, --ck-font-weight-medium, --ck-line-height-tight, --ck-line-height-normal, --ck-radius-sm, --ck-space-1, --ck-space-3',
  ];
}
