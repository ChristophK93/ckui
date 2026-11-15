import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { SAMPLES } from './button-samples';

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

@Component({
  selector: 'docs-button-page',
  imports: [CkButton, RouterLink],
  styleUrl: './button-page.css',
  templateUrl: './button-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonPage {
  protected readonly samples = SAMPLES;
  protected readonly loading = signal(false);

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'variant',
      type: "'primary' | 'secondary' | 'ghost' | 'danger'",
      defaultValue: "'secondary'",
      description: 'The look of the button.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description: 'Height, padding and font size.',
    },
    {
      name: 'iconOnly',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Makes the button square. It needs an aria-label, aria-labelledby or title; development builds warn once if it has none.',
    },
    {
      name: 'loading',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Shows a spinner, keeps the button focusable and blocks clicks. Announces the loading label once when it turns on.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'A button gets the native disabled attribute. A link gets aria-disabled and tabindex -1 and its click is blocked.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-button-radius',
      fallback: 'var(--ck-control-radius)',
      description: 'Corner radius. The library never declares it; set it anywhere.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-primary, -hover, -active and --ck-color-on-primary',
    '--ck-color-danger, -hover, -active and --ck-color-on-danger',
    '--ck-color-control, --ck-color-control-border (the secondary variant)',
    '--ck-color-surface-hover, --ck-color-surface-active',
    '--ck-color-fg, --ck-color-fg-disabled, --ck-color-primary-fg',
    '--ck-font-variant-numeric',
    '--ck-control-height-*, --ck-control-padding-inline-*, --ck-control-font-size-*',
    '--ck-focus-ring, --ck-focus-ring-offset',
  ];

  protected toggleLoading(): void {
    this.loading.update((value) => !value);
  }
}
