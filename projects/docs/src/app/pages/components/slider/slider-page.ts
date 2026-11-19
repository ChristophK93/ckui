import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField, form, max, min } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CkSlider } from '@ckui/core/slider';
import { SAMPLES } from './slider-samples';

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
  selector: 'docs-slider-page',
  imports: [CkSlider, CkButton, RouterLink, FormsModule, ReactiveFormsModule, FormField],
  styleUrl: './slider-page.css',
  templateUrl: './slider-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderPage {
  protected readonly samples = SAMPLES;

  protected readonly level = signal<number | null>(8);
  protected readonly watts = signal<number | null>(150);
  protected readonly committed = signal<readonly number[]>([]);
  protected readonly grade = signal<number | null>(4.5);
  protected readonly rowGrade = signal<number | null>(2);
  protected readonly resistance = signal<number | null>(8);

  protected readonly reactiveGrade = new FormControl<number | null>(2);
  protected templateGrade: number | null = 2;
  protected readonly signalModel = signal<{ grade: number | null }>({ grade: 2 });
  protected readonly signalForm = form(this.signalModel, (path) => {
    min(path.grade, -10);
    max(path.grade, 20);
  });

  protected readonly describeLevel = (level: number): string => `Level ${level} of 24`;

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'value',
      type: 'number | null',
      defaultValue: 'null',
      description:
        'The value, two-way with [(value)]. It is written while the thumb moves, so a form always holds the current number. null is no value: the thumb sits at min and the fill is empty. A value outside the range or off the step is shown clamped and snapped, and is never written back.',
    },
    {
      name: 'min',
      type: 'number',
      defaultValue: '0',
      description:
        'Smallest value, at the inline start of the track and the origin of the step grid. A min above max is a mistake: max counts as min and development builds warn.',
    },
    {
      name: 'max',
      type: 'number',
      defaultValue: '100',
      description:
        'Largest value. A max that is not on the grid counts as the last grid point below it.',
    },
    {
      name: 'step',
      type: 'number',
      defaultValue: '1',
      description:
        'Distance between values, counted from min. It also sets the fraction digits that are shown: 0.5 shows one. A step that is 0, negative or not a number uses 1 and development builds warn.',
    },
    {
      name: 'largeStep',
      type: 'number | null',
      defaultValue: '10 × step',
      description:
        'What Page Up and Page Down move by. Never more than the whole range, never less than one step.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "''",
      description:
        'Text after the value in its text: W reads "250 W", % reads "40%". A unit that is a percent sign is attached without a space, any other unit follows after one.',
    },
    {
      name: 'valueText',
      type: '(value: number) => string',
      defaultValue: 'the formatted value and the unit',
      description:
        'Writes the text for aria-valuetext and for showValue instead, for a value that is better said in words ("Level 8 of 24"). It is called with the shown value, so it never sees one outside the range.',
    },
    {
      name: 'showValue',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Draws the value text next to the track, at the inline end. It is hidden from assistive technology, which reads the thumb. The text is as wide as the widest of the texts of min and max, so the track does not move while the value changes.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description:
        'Height of the control and so of the hit area of the track: 32, 40, 48 and 60px, and at least 44px on a coarse pointer. The thumb is 1, 1.25, 1.5 and 1.75rem.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Takes the thumb out of the tab order and ignores pointer and keys. A disabled form control, Signal Forms field or fieldset disables it too.',
    },
    {
      name: 'aria-label',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The accessible name of the thumb. It is an input, so it is moved off ck-slider (which has no role) onto the thumb. Bind it as [aria-label], not [attr.aria-label].',
    },
    {
      name: 'aria-labelledby',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The ids of the elements that name the thumb. Moved onto the thumb like aria-label.',
    },
    {
      name: 'aria-describedby',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'The ids of a hint or an error for the thumb. Moved onto the thumb like aria-label, so a screen reader reads it with the value.',
    },
    {
      name: 'touched',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Becomes true when focus leaves the slider. It never goes back to false by itself, so read the form’s own state (ng-touched, the field’s touched()) for styling.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'ck-slider',
      description:
        'The control and its form value: a number or null. It has no role and fills the width of its container; the thumb inside is the slider.',
    },
    {
      name: 'span.ck-slider__track',
      description:
        'The hit area: the whole height of the control. A press on it moves the value to the pointer. A vertical swipe on a touch screen still scrolls the page.',
    },
    {
      name: 'span.ck-slider__rail',
      description:
        'The rail with its border, inset so the thumb stays inside the track at both ends.',
    },
    {
      name: 'span.ck-slider__fill',
      description: 'The part of the rail from the start up to the thumb. Empty for no value.',
    },
    {
      name: 'span.ck-slider__thumb',
      description:
        'The thumb, with role="slider". It is the only tab stop and has a hit area of at least 24px, 44px on a coarse pointer, even where it is drawn smaller.',
    },
    {
      name: 'span.ck-slider__value',
      description: 'The value text, with showValue.',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab'],
      action: 'Moves onto the thumb and out again with the next press.',
    },
    {
      keys: ['ArrowRight', 'ArrowUp'],
      action:
        'Adds one step. In right-to-left text ArrowRight subtracts instead, as the track runs from the right; ArrowUp always adds. A value that is off the grid moves to the next grid point.',
    },
    {
      keys: ['ArrowLeft', 'ArrowDown'],
      action:
        'Subtracts one step. In right-to-left text ArrowLeft adds; ArrowDown always subtracts.',
    },
    {
      keys: ['PageUp', 'PageDown'],
      action: 'Adds or subtracts largeStep (10 steps by default).',
    },
    {
      keys: ['Home', 'End'],
      action: 'Jumps to min or max (the last step that fits).',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-slider-track',
      fallback: 'var(--ck-color-control)',
      description: 'Fill of the rail. The border of the rail is --ck-color-control-border.',
    },
    {
      name: '--ck-slider-fill',
      fallback: 'var(--ck-color-primary)',
      description: 'Fill of the rail up to the thumb. Keep it 3:1 against the track.',
    },
    {
      name: '--ck-slider-thumb-bg',
      fallback: 'var(--ck-color-fg)',
      description: 'Fill of the thumb. Keep it 3:1 against the track.',
    },
    {
      name: '--ck-slider-thumb-border',
      fallback: 'var(--ck-color-bg)',
      description:
        'The 2px ring around the thumb. It sets the thumb apart from the fill, which can have a similar colour: keep the ring 3:1 against both the thumb and the fill.',
    },
    {
      name: '--ck-slider-thickness',
      fallback: 'var(--ck-space-2)',
      description: 'Height of the rail.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-control, --ck-color-control-border, --ck-color-primary, --ck-color-bg, --ck-color-fg, --ck-color-fg-disabled, --ck-color-scheme',
    '--ck-focus-ring, --ck-focus-ring-offset, --ck-target-min, --ck-radius-full, --ck-space-2, --ck-space-3',
    '--ck-control-height-*, --ck-control-font-size-*, --ck-font-weight-bold, --ck-font-variant-numeric, --ck-line-height-tight, --ck-duration-fast, --ck-ease-standard',
  ];

  protected record(value: number): void {
    this.committed.update((list) => [...list.slice(-4), value]);
  }

  protected clearLog(): void {
    this.committed.set([]);
  }
}
