/** Inline SVG paths of the icons the demos draw (stroke icons, 24px grid). */
export const ICON_PATHS = {
  timer: '<circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" />',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 012-2h9" />',
  remove: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />',
  settings:
    '<circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />',
} as const;

const SVG_ATTRIBUTES =
  'viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/** An icon of the demos as an inline, decorative SVG, as the samples write it. */
export const icon = (name: keyof typeof ICON_PATHS): string =>
  `<svg aria-hidden="true" ${SVG_ATTRIBUTES}>${ICON_PATHS[name]}</svg>`;

/** A global reset that reaches the bubble. Unlayered, so it wins over the layered tooltip. */
export const RESET_BREAKS = `/* An unlayered reset beats the layered tooltip: the bubble loses its padding and its fill. */
* {
  margin: 0;
  padding: 0;
}

div {
  background: none;
}`;

/** The same reset, kept away from the bubble. */
export const RESET_SCOPED = `/* Keep it off the bubble: */
*:not(.ck-tooltip) {
  margin: 0;
  padding: 0;
}

div:not(.ck-tooltip) {
  background: none;
}

/* Or declare resets in a layer before ckui, so the layered rules win over them: */
@layer reset, ckui;

@layer reset {
  * {
    margin: 0;
    padding: 0;
  }
}`;

/** Code shown on the tooltip page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: `import { Component } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_TOOLTIP_IMPORTS } from '@ckui/core/tooltip';

@Component({
  selector: 'app-toolbar',
  imports: [CK_TOOLTIP_IMPORTS, CkButton],
  template: \`
    <!-- the name comes from aria-label, the tooltip only describes -->
    <button ckButton variant="ghost" iconOnly aria-label="Rest timer" ckTooltip="Starts after each set">
      ${icon('timer')}
    </button>
    <button ckButton variant="ghost" iconOnly aria-label="Edit workout" ckTooltip="Changes blocks and targets">
      ${icon('edit')}
    </button>
    <button ckButton variant="ghost" iconOnly aria-label="Copy workout" ckTooltip="Makes a copy you can change">
      ${icon('copy')}
    </button>
  \`,
})
export class Toolbar {}`,
  positions: `import { Component } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_TOOLTIP_IMPORTS } from '@ckui/core/tooltip';

@Component({
  selector: 'app-positions',
  imports: [CK_TOOLTIP_IMPORTS, CkButton],
  template: \`
    <button ckButton ckTooltip="Above the button" ckTooltipPosition="above">Above</button>
    <button ckButton ckTooltip="Below the button" ckTooltipPosition="below">Below</button>
    <!-- start and end follow the text direction: the left in English, the right in Arabic -->
    <button ckButton ckTooltip="At the start" ckTooltipPosition="start">Start</button>
    <button ckButton ckTooltip="At the end" ckTooltipPosition="end">End</button>
  \`,
})
export class Positions {}`,
  dialog: `import { Component, inject } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS, CkDialog } from '@ckui/core/dialog';
import { CK_TOOLTIP_IMPORTS } from '@ckui/core/tooltip';

@Component({
  selector: 'app-timer-settings',
  imports: [CK_DIALOG_IMPORTS, CK_TOOLTIP_IMPORTS, CkButton],
  template: \`
    <h2 ckDialogTitle>Timer settings</h2>
    <p ckDialogDescription>Hover or focus the button. Escape hides the tooltip first.</p>
    <button ckButton variant="ghost" iconOnly aria-label="Settings" ckTooltip="Rest and warm-up lengths">
      ${icon('settings')}
    </button>
    <ck-dialog-actions>
      <button ckButton ckDialogClose>Done</button>
    </ck-dialog-actions>
  \`,
})
export class TimerSettings {}

@Component({
  selector: 'app-open-settings',
  imports: [CkButton],
  template: \`<button ckButton (click)="open()">Timer settings</button>\`,
})
export class OpenSettings {
  private readonly dialog = inject(CkDialog);

  protected open(): void {
    this.dialog.open(TimerSettings);
  }
}`,
  control: `import { Component, signal } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_TOOLTIP_IMPORTS } from '@ckui/core/tooltip';

@Component({
  selector: 'app-tooltip-control',
  imports: [CK_TOOLTIP_IMPORTS, CkButton],
  template: \`
    <!-- the text is a signal: the open tooltip follows it -->
    <button ckButton #tip="ckTooltip" [ckTooltip]="hint()" [ckTooltipDisabled]="muted()" [ckTooltipShowDelay]="200">
      Rest timer
    </button>
    <button ckButton (click)="tip.isVisible() ? tip.hide() : tip.show()">Toggle</button>
    <button ckButton (click)="muted.set(!muted())">Mute tooltips</button>
    <button ckButton (click)="hint.set('Changed text')">Change text</button>
  \`,
})
export class TooltipControl {
  protected readonly hint = signal('Starts after each set');
  protected readonly muted = signal(false);
}`,
  reset: `${RESET_BREAKS}

${RESET_SCOPED}`,
  tokens: `:root,
[data-ck-theme='light'] {
  /* The bubble sits on body, outside the button, so set these on :root or the theme, not on a wrapper. */
  --ck-tooltip-bg: var(--ck-indigo-900);
  --ck-tooltip-fg: var(--ck-white);
  --ck-tooltip-radius: var(--ck-radius-md);
  --ck-tooltip-max-width: 16rem;
  --ck-tooltip-font-size: var(--ck-font-size-md);
}`,
};
