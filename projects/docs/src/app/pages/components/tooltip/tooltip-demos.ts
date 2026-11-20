import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS } from '@ckui/core/dialog';
import { CK_TOOLTIP_IMPORTS } from '@ckui/core/tooltip';

/** The dialog of the demo: a tooltip button inside it, to show that Escape hides the tooltip first. */
@Component({
  selector: 'docs-timer-settings',
  imports: [CK_DIALOG_IMPORTS, CK_TOOLTIP_IMPORTS, CkButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 ckDialogTitle>Timer settings</h2>
    <p ckDialogDescription>Focus the button with Tab. Escape hides the tooltip first.</p>
    <button
      ckButton
      variant="ghost"
      iconOnly
      aria-label="Settings"
      ckTooltip="Rest and warm-up lengths"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </svg>
    </button>
    <ck-dialog-actions>
      <button ckButton ckDialogInitialFocus ckDialogClose>Done</button>
    </ck-dialog-actions>
  `,
})
export class TimerSettings {}
