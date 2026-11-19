/** Inline SVG paths of the icons the demos draw (stroke icons, 24px grid). */
export const ICON_PATHS = {
  more: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />',
  start: '<path d="M7 5v14l12-7z" />',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 012-2h9" />',
  remove: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />',
} as const;

const SVG_ATTRIBUTES =
  'viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/** The leading icon of an item, as the samples write it. */
export const itemIcon = (name: keyof typeof ICON_PATHS): string =>
  `<svg ckMenuItemIcon ${SVG_ATTRIBUTES}>${ICON_PATHS[name]}</svg>`;

/** The icon-only trigger content. */
export const triggerIcon = (): string =>
  `<svg aria-hidden="true" ${SVG_ATTRIBUTES}>${ICON_PATHS.more}</svg>`;

/** A global reset that reaches the menu's parts. Unlayered, so it wins over the layered menu. */
export const RESET_BREAKS = `/* An unlayered reset beats the layered menu: the rows lose their padding and the cancel row its fill. */
button {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
}`;

/** The same reset, kept away from the menu's rows and the Cancel row. */
export const RESET_SCOPED = `/* Keep it off the menu's parts: */
button:not(.ck-menu-item):not(.ck-menu-panel__cancel) {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
}

/* Or declare resets in a layer before ckui, so the layered rules win over them: */
@layer reset, ckui;

@layer reset {
  button {
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
  }
}`;

/** Code shown on the menu page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: `import { Component, signal } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_MENU_IMPORTS } from '@ckui/core/menu';

@Component({
  selector: 'app-workout-row',
  imports: [CK_MENU_IMPORTS, CkButton],
  template: \`
    <button ckButton variant="ghost" iconOnly [ckMenuTrigger]="rowMenu" aria-label="Actions for Sweet Spot">
      ${triggerIcon()}
    </button>
    <ng-template #rowMenu>
      <ck-menu>
        <button ckMenuItem (click)="choose('start')">
          ${itemIcon('start')}Start
        </button>
        <button ckMenuItem (click)="choose('edit')">
          ${itemIcon('edit')}Edit
        </button>
        <button ckMenuItem (click)="choose('copy')">
          ${itemIcon('copy')}Copy
        </button>
        <ck-menu-divider />
        <button ckMenuItem tone="danger" (click)="choose('delete')">
          ${itemIcon('remove')}Delete
        </button>
      </ck-menu>
    </ng-template>
    <output>{{ last() }}</output>
  \`,
})
export class WorkoutRow {
  protected readonly last = signal('nothing yet');

  protected choose(action: string): void {
    this.last.set(action);
  }
}`,
  disabled: `import { Component } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_MENU_IMPORTS } from '@ckui/core/menu';

@Component({
  selector: 'app-export-menu',
  imports: [CK_MENU_IMPORTS, CkButton],
  template: \`
    <button ckButton [ckMenuTrigger]="exportMenu">Export</button>
    <ng-template #exportMenu>
      <ck-menu>
        <button ckMenuItem>As PDF</button>
        <button ckMenuItem>As CSV</button>
        <!-- stays focusable and is read as dimmed; Enter, Space and a click do nothing -->
        <button ckMenuItem disabled>As FIT file (needs a plan)</button>
      </ck-menu>
    </ng-template>
  \`,
})
export class ExportMenu {}`,
  confirm: `import { Component, inject } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS, CkDialog } from '@ckui/core/dialog';
import { CK_MENU_IMPORTS } from '@ckui/core/menu';

@Component({
  selector: 'app-confirm-delete',
  imports: [CK_DIALOG_IMPORTS, CkButton],
  template: \`
    <h2 ckDialogTitle>Delete this workout?</h2>
    <p ckDialogDescription>All sets are removed. This cannot be undone.</p>
    <ck-dialog-actions>
      <button ckButton ckDialogInitialFocus ckDialogClose="keep">Keep it</button>
      <button ckButton variant="danger" ckDialogClose="delete">Delete</button>
    </ck-dialog-actions>
  \`,
})
export class ConfirmDelete {}

@Component({
  selector: 'app-workout-actions',
  imports: [CK_MENU_IMPORTS, CkButton],
  template: \`
    <button ckButton [ckMenuTrigger]="actions">Actions</button>
    <ng-template #actions>
      <ck-menu>
        <button ckMenuItem>Edit</button>
        <button ckMenuItem tone="danger" (click)="remove()">Delete</button>
      </ck-menu>
    </ng-template>
  \`,
})
export class WorkoutActions {
  private readonly dialog = inject(CkDialog);

  // The menu is already closing when this runs, so the dialog opens on a quiet page and gives
  // focus back to the "Actions" button.
  protected async remove(): Promise<void> {
    const ref = this.dialog.open<ConfirmDelete, void, 'keep' | 'delete'>(ConfirmDelete, {
      role: 'alertdialog',
      closeButton: false,
    });
    if ((await ref.closed) === 'delete') {
      // delete it
    }
  }
}`,
  events: `import { Component, signal } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CK_MENU_IMPORTS } from '@ckui/core/menu';

@Component({
  selector: 'app-menu-events',
  imports: [CK_MENU_IMPORTS, CkButton],
  template: \`
    <button
      ckButton
      #trigger="ckMenuTrigger"
      [ckMenuTrigger]="sortMenu"
      (menuOpened)="opened.set(opened() + 1)"
      (menuClosed)="open.set(false)"
    >
      Sort by
    </button>
    <button ckButton (click)="trigger.isOpen() ? trigger.close() : trigger.open()">Toggle</button>
    <ng-template #sortMenu>
      <ck-menu>
        <button ckMenuItem>Name</button>
        <button ckMenuItem>Date</button>
      </ck-menu>
    </ng-template>
  \`,
})
export class MenuEvents {
  protected readonly opened = signal(0);
  protected readonly open = signal(false);
}`,
  reset: `${RESET_BREAKS}

${RESET_SCOPED}`,
  tokens: `:root,
[data-ck-theme='light'] {
  /* The menu is drawn in the overlay container, so set these on :root or the theme, not on a wrapper. */
  --ck-menu-bg: var(--ck-white);
  --ck-menu-radius: var(--ck-radius-lg);
  --ck-menu-shadow: var(--ck-shadow-lg);
  --ck-menu-min-width: 14rem;
  --ck-menu-max-height: 16rem;
  --ck-menu-item-bg-active: color-mix(in oklch, var(--ck-indigo-600) 12%, transparent);
  --ck-menu-item-fg-danger: var(--ck-red-800);
}`,
};
