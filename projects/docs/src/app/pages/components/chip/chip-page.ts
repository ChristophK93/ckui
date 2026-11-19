import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_CHIP_IMPORTS } from '@ckui/core/chip';
import { SAMPLES } from './chip-samples';

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
  readonly keys: string;
  readonly action: string;
}

interface TokenRow {
  readonly name: string;
  readonly fallback: string;
  readonly description: string;
}

@Component({
  selector: 'docs-chip-page',
  imports: [CK_CHIP_IMPORTS, CkButton, RouterLink],
  styleUrl: './chip-page.css',
  templateUrl: './chip-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipPage {
  protected readonly samples = SAMPLES;

  protected readonly endurance = signal(true);
  protected readonly vo2 = signal(false);
  protected readonly threshold = signal(false);
  protected readonly favourites = signal(false);
  protected readonly resetEndurance = signal(true);
  protected readonly resetVo2 = signal(true);
  protected readonly resetThreshold = signal(true);
  protected readonly cleared = signal(0);

  protected readonly inputs: readonly InputRow[] = [
    {
      name: 'selected',
      on: 'button[ckChip]',
      type: 'boolean (model)',
      defaultValue: 'false',
      description:
        'Whether the chip is on. Use [(selected)]. A click toggles it and emits selectedChange; setting it from code never emits. It is written to aria-pressed as "true" or "false".',
    },
    {
      name: 'size',
      on: 'button[ckChip]',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: "'sm'",
      description:
        'Height and text size, from the control-height tokens: 2rem at sm, 2.5rem at md, 3rem at lg, 3.75rem at xl. sm and md grow to 2.75rem under a coarse pointer, xl stays 3.75rem. An unknown value falls back to sm.',
    },
    {
      name: 'disabled',
      on: 'button[ckChip]',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Sets the native disabled attribute, so the chip leaves the tab order and ignores clicks and keys. A disabled fieldset around it has the same effect and the same look.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'button[ckChip]',
      description:
        'The chip. It is a native button: type defaults to button when you set none, and your own type, tabindex, aria-label, aria-describedby and class stay on it. The chip owns aria-pressed.',
    },
    {
      name: 'ckChipIcon',
      description:
        'An attribute for a leading icon, usually an inline svg. It is drawn before the label, one em wide, and marked aria-hidden. While the chip is selected it is replaced by a check mark.',
    },
    {
      name: 'ck-chip-group',
      description:
        'A wrapping row of chips with role="group". Give it an aria-label or aria-labelledby: development builds warn without one. The space between chips is --ck-chip-group-gap.',
    },
    {
      name: 'CK_CHIP_IMPORTS',
      description: 'All three of the above in one array: imports: [CK_CHIP_IMPORTS].',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    { keys: 'Tab, Shift + Tab', action: 'Moves focus to the next or previous chip.' },
    { keys: 'Space', action: 'Toggles the focused chip.' },
    { keys: 'Enter', action: 'Toggles the focused chip.' },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-chip-bg',
      fallback: 'var(--ck-color-control)',
      description: 'Fill of an unselected chip.',
    },
    {
      name: '--ck-chip-fg',
      fallback: 'var(--ck-color-fg)',
      description: 'Text colour of an unselected chip. Keep it at 4.5:1 on the fill.',
    },
    {
      name: '--ck-chip-border-color',
      fallback: 'var(--ck-color-control-border)',
      description:
        'Border of an unselected chip. A selected chip draws its border in its own fill colour.',
    },
    {
      name: '--ck-chip-selected-bg',
      fallback: 'var(--ck-color-primary)',
      description:
        'Fill of a selected chip. It must stay 3:1 away from the unselected fill; the check mark carries the state as well.',
    },
    {
      name: '--ck-chip-selected-fg',
      fallback: 'var(--ck-color-on-primary)',
      description:
        'Text and check colour of a selected chip. Keep it at 4.5:1 on the selected fill.',
    },
    {
      name: '--ck-chip-radius',
      fallback: 'var(--ck-radius-full)',
      description: 'Corner radius of the chip.',
    },
    {
      name: '--ck-chip-group-gap',
      fallback: 'var(--ck-space-2)',
      description: 'Space between chips in a group, in a row and between wrapped rows.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-control, --ck-color-control-border, --ck-color-fg, --ck-color-fg-disabled, --ck-color-primary, --ck-color-on-primary, --ck-color-scheme',
    '--ck-color-surface-hover, --ck-color-surface-active, --ck-focus-ring, --ck-focus-ring-offset',
    '--ck-control-height-sm … --ck-control-height-xl, --ck-control-padding-inline-sm … -xl, --ck-control-font-size-sm … -xl',
    '--ck-font-weight-medium, --ck-font-variant-numeric, --ck-line-height-tight, --ck-radius-full',
    '--ck-space-1, --ck-space-2, --ck-duration-fast, --ck-ease-standard',
  ];

  protected clear(): void {
    this.resetEndurance.set(false);
    this.resetVo2.set(false);
    this.resetThreshold.set(false);
    this.cleared.update((count) => count + 1);
  }
}
