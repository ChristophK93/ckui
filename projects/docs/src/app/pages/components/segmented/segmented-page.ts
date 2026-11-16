import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_SEGMENTED_IMPORTS } from '@ckui/core/segmented';
import { SAMPLES } from './segmented-samples';

interface InputRow {
  readonly name: string;
  readonly on: string;
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
  selector: 'docs-segmented-page',
  imports: [
    CK_SEGMENTED_IMPORTS,
    CkButton,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    FormField,
  ],
  styleUrl: './segmented-page.css',
  templateUrl: './segmented-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedPage {
  protected readonly samples = SAMPLES;

  protected readonly view = signal<string | null>('week');
  protected readonly priority = signal<string | null>(null);
  protected readonly language = signal<'de' | 'en'>('en');

  protected readonly reactiveView = new FormControl<string | null>('week');
  protected templateView: string | null = 'week';
  protected readonly signalModel = signal<{ view: string | null }>({ view: 'week' });
  protected readonly signalForm = form(this.signalModel);

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'value',
      on: 'ck-segmented',
      type: 'T | null',
      defaultValue: 'null',
      description:
        'The value of the selected segment, two-way with [(value)]. null, or a value no segment has, selects nothing and hides the indicator. Values are compared with Object.is.',
    },
    {
      name: 'size',
      on: 'ck-segmented',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description:
        'Height of the control and font size of its segments. The height is the control height of that size, so the group lines up with buttons and inputs.',
    },
    {
      name: 'disabled',
      on: 'ck-segmented',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables every segment. A disabled form control or Signal Forms field disables it too.',
    },
    {
      name: 'fullWidth',
      on: 'ck-segmented',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Stretches the group to the width of its container. Without it the group is as wide as its widest segment times the number of segments.',
    },
    {
      name: 'touched',
      on: 'ck-segmented',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Becomes true when focus leaves the whole group. It never goes back to false by itself, so read the form’s own state (ng-touched, the field’s touched()) for styling.',
    },
    {
      name: 'value',
      on: 'ck-segment',
      type: 'T',
      defaultValue: 'required',
      description:
        'What the group’s value becomes when this segment is selected. Any type; objects are compared by identity.',
    },
    {
      name: 'disabled',
      on: 'ck-segment',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables this segment. It stays visible, cannot be selected and is skipped by the arrow keys.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'ck-segmented',
      description:
        'The group and its form control. A radiogroup that needs an aria-label or aria-labelledby.',
    },
    {
      name: 'ck-segment',
      description:
        'One option, a radio. Its content is text, an icon, or both. Other attributes (aria-label, lang, id, class, title) stay on it.',
    },
    {
      name: 'svg',
      description:
        'A direct svg child is the segment’s icon. It is always drawn before the text, one em wide, and an aria-hidden svg stays out of the accessible name.',
    },
    {
      name: 'CK_SEGMENTED_IMPORTS',
      description: 'Both of the above in one array: imports: [CK_SEGMENTED_IMPORTS].',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab'],
      action:
        'Moves into the group, onto the selected segment, or onto the first enabled one when nothing is selected, and out again with the next press. The group is one tab stop; Shift+Tab goes back.',
    },
    {
      keys: ['ArrowRight', 'ArrowDown'],
      action:
        'Moves to the next enabled segment and selects it. After the last it wraps to the first. In right-to-left text ArrowRight goes to the previous segment, ArrowDown still to the next.',
    },
    {
      keys: ['ArrowLeft', 'ArrowUp'],
      action:
        'Moves to the previous enabled segment and selects it, wrapping from the first to the last. In right-to-left text ArrowLeft goes to the next segment, ArrowUp still to the previous.',
    },
    {
      keys: ['Home', 'End'],
      action: 'Moves to the first or last enabled segment and selects it.',
    },
    {
      keys: ['Space'],
      action: 'Selects the focused segment.',
    },
    {
      keys: ['Enter'],
      action: 'Does nothing, as on native radio buttons.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-segmented-bg',
      fallback: 'var(--ck-color-control)',
      description: 'Fill of the track.',
    },
    {
      name: '--ck-segmented-border-color',
      fallback: 'var(--ck-color-control-border)',
      description:
        'The track border and the border of the indicator. The indicator border is what marks the selected segment without colour, so keep it at 3:1 against the track.',
    },
    {
      name: '--ck-segmented-fg',
      fallback: 'var(--ck-color-fg-muted)',
      description: 'Text colour of the segments that are not selected.',
    },
    {
      name: '--ck-segmented-indicator-bg',
      fallback: 'var(--ck-color-surface-raised)',
      description: 'Fill of the indicator behind the selected segment.',
    },
    {
      name: '--ck-segmented-indicator-fg',
      fallback: 'var(--ck-color-fg)',
      description:
        'Text colour of the selected segment. Keep it at 4.5:1 on the indicator fill. A theme with a transparent control border sets the indicator fill too, so the selected segment stays 3:1 from the track.',
    },
    {
      name: '--ck-segmented-radius',
      fallback: 'var(--ck-control-radius)',
      description:
        'Corner radius of the track. The indicator’s is the same minus the padding, never below zero.',
    },
    {
      name: '--ck-segmented-padding',
      fallback: 'var(--ck-space-1)',
      description:
        'Gap between the track edge and the indicator. The segments still fill the full height.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-control, --ck-color-control-border, --ck-color-surface-raised, --ck-color-surface-hover',
    '--ck-color-fg, --ck-color-fg-muted, --ck-color-fg-disabled, --ck-color-scheme',
    '--ck-control-height-*, --ck-control-padding-inline-*, --ck-control-font-size-*',
    '--ck-control-radius, --ck-focus-ring, --ck-focus-ring-width',
    '--ck-shadow-sm, --ck-space-1, --ck-space-2, --ck-font-weight-medium, --ck-font-variant-numeric',
    '--ck-line-height-tight, --ck-duration-normal, --ck-ease-standard',
  ];

  protected clearPriority(): void {
    this.priority.set(null);
  }
}
