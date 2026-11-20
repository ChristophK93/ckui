import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CkDialog } from '@ckui/core/dialog';
import { CK_TOOLTIP_IMPORTS } from '@ckui/core/tooltip';
import { TimerSettings } from './tooltip-demos';
import { SAMPLES } from './tooltip-samples';

interface MemberRow {
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
  selector: 'docs-tooltip-page',
  imports: [CK_TOOLTIP_IMPORTS, CkButton, RouterLink],
  styleUrl: './tooltip-page.css',
  templateUrl: './tooltip-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipPage {
  protected readonly samples = SAMPLES;
  private readonly dialog = inject(CkDialog);

  protected readonly hint = signal('Starts after each set');
  protected readonly muted = signal(false);

  protected openSettings(): void {
    this.dialog.open(TimerSettings);
  }

  protected toggleHint(): void {
    this.hint.set(
      this.hint() === 'Starts after each set'
        ? 'Changed while it is open'
        : 'Starts after each set',
    );
  }

  protected readonly members: readonly MemberRow[] = [
    {
      name: 'ckTooltip',
      type: 'string | null | undefined',
      defaultValue: 'required',
      description:
        'The text. Plain text only: markup is shown as typed and nothing in the bubble can be focused or clicked. An empty, blank, null or undefined text shows nothing and wires nothing. The attribute goes on a focusable element; development builds warn about a host without an accessible name.',
    },
    {
      name: 'ckTooltipPosition',
      type: "'above' | 'below' | 'start' | 'end'",
      defaultValue: "'above'",
      description:
        'The preferred side. Without room there it flips to the opposite side, and it shifts along the other axis to stay a margin inside the viewport. start and end follow the text direction of the host.',
    },
    {
      name: 'ckTooltipShowDelay',
      type: 'number',
      defaultValue: '500',
      description:
        'Milliseconds the mouse rests on the host before the bubble shows. Keyboard focus shows it at once. Moving to another tooltip within 300 ms of one hiding skips the delay.',
    },
    {
      name: 'ckTooltipDisabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Turns the tooltip off without removing the binding. An open tooltip hides, and the host loses its description.',
    },
    {
      name: 'show()',
      type: '() => void',
      defaultValue: '',
      description:
        'Shows the tooltip now. Does nothing without text, while disabled or on the server. Reach it with #tip="ckTooltip".',
    },
    {
      name: 'hide()',
      type: '() => void',
      defaultValue: '',
      description: 'Hides the tooltip now.',
    },
    {
      name: 'isVisible',
      type: 'Signal<boolean>',
      defaultValue: 'false',
      description: 'Whether the bubble is showing.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: '[ckTooltip]',
      description:
        'The host: a focusable element such as a button, a link or an input. It keeps every attribute you gave it. Its aria-describedby gets the id of the bubble added, and your own ids stay.',
    },
    {
      name: '.ck-tooltip',
      description:
        'The bubble: one element with role="tooltip" and a generated id, a native popover (popover="manual") in the top layer. The side it ended up on is a class: .ck-tooltip--above, --below, --start or --end.',
    },
    {
      name: '.ck-tooltip-layer',
      description:
        'One element on the page body that holds every bubble, marked data-ck-inert-exempt so the inert page behind a dialog never hides a tooltip. It has no box of its own and stays, empty, after the last tooltip is gone.',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab', 'Shift+Tab'],
      action:
        'Focusing the host with the keyboard shows the tooltip at once; moving on hides it. A focus that a mouse click gives does not show it (:focus-visible only).',
    },
    {
      keys: ['Escape'],
      action:
        'Hides the visible tooltip and stops there: a dialog, menu or sheet around it stays open. A second Escape reaches them. Without a visible tooltip the key is not touched.',
    },
    {
      keys: ['Hover'],
      action:
        'The bubble shows after the delay. It hides 100 ms after the pointer leaves both the host and the bubble, so you can move onto the bubble and read it (WCAG 1.4.13). A press on the host hides it.',
    },
    {
      keys: ['Long-press'],
      action:
        'On a touch screen, holding the host for 500 ms shows the bubble (a finger that moves 10 px is a scroll). The click that ends the press does not reach the host. The bubble hides 1.5 s after the finger lifts, or on the next press anywhere. A plain tap does nothing tooltip-related.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-tooltip-bg',
      fallback: 'var(--ck-color-fg)',
      description:
        'Fill of the bubble: the text colour of the theme, so it is dark on the light theme and light on the dark one.',
    },
    {
      name: '--ck-tooltip-fg',
      fallback: 'var(--ck-color-surface)',
      description: 'Text of the bubble. Keep it 4.5:1 on the fill.',
    },
    {
      name: '--ck-tooltip-radius',
      fallback: 'var(--ck-radius-sm)',
      description: 'Corner radius of the bubble.',
    },
    {
      name: '--ck-tooltip-max-width',
      fallback: 'min(20rem, 100% - 2 * var(--ck-space-2))',
      description:
        'Width at which the text wraps. The default also keeps the bubble a margin away from both screen edges. Text always wraps; it is never cut with an ellipsis.',
    },
    {
      name: '--ck-tooltip-font-size',
      fallback: 'var(--ck-font-size-sm)',
      description: 'Font size of the text.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-fg, --ck-color-surface, --ck-color-scheme',
    '--ck-radius-sm, --ck-space-1, --ck-space-2, --ck-font-sans, --ck-font-size-sm, --ck-font-weight-medium, --ck-line-height-normal',
    '--ck-duration-fast, --ck-ease-standard',
  ];
}
