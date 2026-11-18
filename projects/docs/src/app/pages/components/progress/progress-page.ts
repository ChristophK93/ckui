import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CkProgress } from '@ckui/core/progress';
import { SAMPLES } from './progress-samples';

interface InputRow {
  readonly name: string;
  readonly type: string;
  readonly defaultValue: string;
  readonly description: string;
}

interface TokenRow {
  readonly name: string;
  readonly fallback: string;
  readonly description: string;
}

const STEP_COUNT = 7;

@Component({
  selector: 'docs-progress-page',
  imports: [CkProgress, CkButton, RouterLink],
  styleUrl: './progress-page.css',
  templateUrl: './progress-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressPage {
  protected readonly samples = SAMPLES;
  protected readonly stepCount = STEP_COUNT;

  protected readonly percent = signal(40);
  protected readonly step = signal(2);

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'value',
      type: 'number | null | undefined',
      defaultValue: 'null',
      description:
        'How far along the work is, from 0 to max. A number below 0 counts as 0 and one above max counts as max, also in aria-valuenow. null, undefined, NaN or anything that is not a number shows the indeterminate bar, without aria-valuenow.',
    },
    {
      name: 'max',
      type: 'number',
      defaultValue: '100',
      description:
        'The value that means done. A max that is not a finite number above 0 (0, a negative number, NaN, Infinity) counts as 100, so the bar never divides by zero.',
    },
    {
      name: 'valueText',
      type: 'string | undefined',
      defaultValue: 'undefined',
      description:
        'Text for aria-valuetext, for a value that is more than a percentage: "Step 2 of 7". Without it assistive technology reads the share of max. An empty string counts as unset.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-progress-track',
      fallback: 'var(--ck-color-control)',
      description: 'Fill of the track behind the bar.',
    },
    {
      name: '--ck-progress-fill',
      fallback: 'var(--ck-color-primary)',
      description:
        'Fill of the bar itself. Keep it at 3:1 against the track: the bar is how the value is read, so it counts as a graphic.',
    },
    {
      name: '--ck-progress-thickness',
      fallback: 'var(--ck-space-1)',
      description: 'Height of the bar. The width is the width of its container.',
    },
    {
      name: '--ck-progress-radius',
      fallback: 'var(--ck-radius-full)',
      description: 'Corner radius of the track and the fill.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-control, --ck-color-primary, --ck-color-scheme',
    '--ck-radius-full, --ck-space-1, --ck-duration-normal, --ck-duration-slow, --ck-ease-standard',
  ];

  protected more(): void {
    this.percent.update((percent) => percent + 30);
  }

  protected less(): void {
    this.percent.update((percent) => percent - 30);
  }

  protected next(): void {
    this.step.update((step) => Math.min(step + 1, STEP_COUNT));
  }

  protected previous(): void {
    this.step.update((step) => Math.max(step - 1, 1));
  }
}
