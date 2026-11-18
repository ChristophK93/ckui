import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_BADGE_IMPORTS } from '@ckui/core/badge';
import { SAMPLES } from './badge-samples';

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

interface TokenRow {
  readonly name: string;
  readonly fallback: string;
  readonly description: string;
}

@Component({
  selector: 'docs-badge-page',
  imports: [CK_BADGE_IMPORTS, CkButton, RouterLink],
  styleUrl: './badge-page.css',
  templateUrl: './badge-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgePage {
  protected readonly samples = SAMPLES;

  protected readonly connected = signal(true);
  protected readonly announcement = signal('');

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'tone',
      on: 'ck-badge',
      type: "'neutral' | 'success' | 'warning' | 'danger'",
      defaultValue: "'neutral'",
      description:
        'Colours. Neutral, success and warning sit on the control fill with the foreground, success or warning text colour; danger is filled with the danger colour and its on-danger text. An unknown value falls back to neutral.',
    },
    {
      name: 'dot',
      on: 'ck-badge',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Draws a small round dot before the text, in the text colour. The dot is decorative and hidden from assistive technology.',
    },
    {
      name: 'size',
      on: 'ck-badge',
      type: "'sm' | 'md'",
      defaultValue: "'md'",
      description:
        'md is a 1.5rem pill with 0.875rem text, sm is 1.25rem with 0.75rem text, for dense lists. An unknown value falls back to md. A badge is not a target, so neither size grows under a coarse pointer.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'ck-badge',
      description:
        'The pill. A plain inline element without a role. Its content is the text; other attributes (id, class, lang, title) stay on it.',
    },
    {
      name: 'ckBadgeIcon',
      description:
        'An attribute for the leading icon, usually an inline svg. It is drawn before the text, one em wide, and marked aria-hidden. It does not matter where in the badge you write it.',
    },
    {
      name: 'CK_BADGE_IMPORTS',
      description: 'Both of the above in one array: imports: [CK_BADGE_IMPORTS].',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-badge-bg',
      fallback: 'var(--ck-color-control), danger: var(--ck-color-danger)',
      description:
        'Fill of the badge. When set it applies to every tone, so scope it by the tone class (ck-badge--danger) to restyle one tone. Keep the text at 4.5:1 on it.',
    },
    {
      name: '--ck-badge-fg',
      fallback:
        'var(--ck-color-fg), success: var(--ck-color-success-fg), warning: var(--ck-color-warning-fg), danger: var(--ck-color-on-danger)',
      description: 'Text colour. The dot and an icon drawn with currentColor follow it.',
    },
    {
      name: '--ck-badge-dot',
      fallback: 'currentColor',
      description:
        'Colour of the dot, on its own. Without it the dot follows the text colour. A coloured dot is decoration, so the text must still state the status; keep it at 3:1 against the badge fill.',
    },
    {
      name: '--ck-badge-radius',
      fallback: 'var(--ck-radius-full)',
      description: 'Corner radius of the pill.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-control, --ck-color-fg, --ck-color-danger, --ck-color-on-danger, --ck-color-scheme',
    '--ck-color-success-fg, --ck-color-warning-fg',
    '--ck-font-size-xs, --ck-font-size-sm, --ck-font-weight-semibold, --ck-font-variant-numeric',
    '--ck-line-height-tight, --ck-radius-full, --ck-space-1, --ck-space-2',
  ];

  protected toggle(): void {
    this.connected.update((connected) => !connected);
    this.announcement.set(this.connected() ? 'Trainer connected' : 'Trainer disconnected');
  }
}
