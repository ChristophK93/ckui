import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CkDialog } from '@ckui/core/dialog';
import { CK_MENU_IMPORTS } from '@ckui/core/menu';
import { ConfirmDelete } from './menu-demos';
import { SAMPLES } from './menu-samples';

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

interface Workout {
  readonly id: string;
  readonly name: string;
  readonly meta: string;
}

@Component({
  selector: 'docs-menu-page',
  imports: [CK_MENU_IMPORTS, CkButton, RouterLink],
  styleUrl: './menu-page.css',
  templateUrl: './menu-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPage {
  protected readonly samples = SAMPLES;
  private readonly dialog = inject(CkDialog);

  protected readonly workouts: readonly Workout[] = [
    { id: 'zone2', name: 'Zone 2', meta: '90 min · 180 W' },
    { id: 'sweet-spot', name: 'Sweet Spot', meta: '60 min · 240 W' },
    { id: 'vo2', name: 'VO2 max', meta: '45 min · 320 W' },
  ];

  protected readonly last = signal('nothing yet');
  protected readonly exported = signal('nothing yet');
  protected readonly deleted = signal('nothing yet');
  protected readonly opened = signal(0);
  protected readonly closed = signal(0);

  protected choose(workout: Workout, action: string): void {
    this.last.set(`${action} ${workout.name}`);
  }

  protected async remove(workout: Workout): Promise<void> {
    const ref = this.dialog.open<ConfirmDelete, void, 'keep' | 'delete'>(ConfirmDelete, {
      role: 'alertdialog',
      closeButton: false,
    });
    const answer = await ref.closed;
    this.deleted.set(`${answer ?? 'dismissed'} ${workout.name}`);
  }

  protected readonly triggerMembers: readonly InputRow[] = [
    {
      name: 'ckMenuTrigger',
      type: 'TemplateRef',
      defaultValue: 'required',
      description:
        'The template that holds the ck-menu. null or undefined does nothing. The attribute goes on a native button; development builds warn about any other element and about a button without a name.',
    },
    {
      name: 'menuOpened',
      type: 'output<void>',
      defaultValue: '',
      description: 'Emits when the menu has opened.',
    },
    {
      name: 'menuClosed',
      type: 'output<void>',
      defaultValue: '',
      description:
        'Emits when it has closed, whatever closed it: an item, Escape, Tab, an outside press, the button leaving view or the Cancel row.',
    },
    {
      name: 'open()',
      type: '(edge?: "first" | "last") => void',
      defaultValue: '"first"',
      description:
        'Opens the menu with the first or the last enabled item focused. Does nothing while open, on a disabled button or on the server. Reach it with #trigger="ckMenuTrigger".',
    },
    {
      name: 'close()',
      type: '() => void',
      defaultValue: '',
      description: 'Closes the menu. Focus goes back to the button when it was inside the menu.',
    },
    {
      name: 'isOpen',
      type: 'Signal<boolean>',
      defaultValue: 'false',
      description: 'Whether the menu is open.',
    },
  ];

  protected readonly menuInputs: readonly InputRow[] = [
    {
      name: 'id',
      type: 'string',
      defaultValue: 'ck-menu-n',
      description:
        'The id of the menu, which the button points aria-controls at while it is open. Replace it for a stable id in tests.',
    },
  ];

  protected readonly itemInputs: readonly InputRow[] = [
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Dims the item. It stays focusable and a screen reader reads it as dimmed (aria-disabled), but Enter, Space and a click do nothing and the menu stays open. The native disabled attribute is removed: it would take the item out of the arrow-key order.',
    },
    {
      name: 'tone',
      type: "'default' | 'danger'",
      defaultValue: "'default'",
      description:
        'danger draws the text in the danger colour, for an action that destroys something. Colour is never the only sign: the word or an icon has to say it too.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'button[ckMenuTrigger]',
      description:
        'The native button that opens the menu. It keeps every attribute you gave it (type, aria-*, id) and works together with ckButton on the same element.',
    },
    {
      name: 'ck-menu',
      description:
        'The list, role="menu", named by the button. Put it alone in the template the button is given.',
    },
    {
      name: 'button[ckMenuItem]',
      description:
        'One action, role="menuitem", a native button that keeps its (click). Its text is what typeahead matches.',
    },
    {
      name: '[ckMenuItemIcon]',
      description:
        'The leading icon of an item, inline SVG or any element. It is hidden from assistive technology.',
    },
    {
      name: 'ck-menu-divider',
      description: 'A line between two groups of items, role="separator".',
    },
    {
      name: 'ck-menu-panel',
      description:
        'What the overlay shows: a popover under the button, or on a phone the bottom sheet with a title and a Cancel row. It is drawn in the overlay container, not next to the button.',
    },
  ];

  protected readonly triggerKeys: readonly KeyRow[] = [
    { keys: ['Enter', 'Space'], action: 'Opens the menu with the first enabled item focused.' },
    { keys: ['ArrowDown'], action: 'Opens the menu with the first enabled item focused.' },
    { keys: ['ArrowUp'], action: 'Opens the menu with the last enabled item focused.' },
    { keys: ['Click'], action: 'Opens the menu, or closes it when it is already open.' },
  ];

  protected readonly menuKeys: readonly KeyRow[] = [
    {
      keys: ['ArrowDown', 'ArrowUp'],
      action:
        'Moves focus to the next or the previous item and wraps at the ends. Disabled items are included: they are focusable.',
    },
    { keys: ['Home', 'End'], action: 'Moves focus to the first or the last item.' },
    {
      keys: ['a–z, 0–9, …'],
      action:
        'Typeahead: moves focus to the next item whose text starts with what was typed. Letters typed within half a second make one search; the same letter again moves on. A space continues a running search. A matching disabled item gets focus but is not activated.',
    },
    {
      keys: ['Enter', 'Space'],
      action:
        'Activates the focused item: the menu closes first, focus goes back to the button, then your (click) runs. A disabled item does nothing and the menu stays open.',
    },
    { keys: ['Escape'], action: 'Closes the menu and returns focus to the button.' },
    {
      keys: ['Tab', 'Shift+Tab'],
      action:
        'Closes the menu and moves focus on from the button: to the next or the previous element on the page. (In the sheet on a phone Tab stays inside, and reaches the Cancel row.)',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-menu-bg',
      fallback: 'var(--ck-color-surface-raised)',
      description: 'Fill of the popover and of the bottom sheet.',
    },
    {
      name: '--ck-menu-radius',
      fallback: 'var(--ck-radius-md)',
      description: 'Corner radius of the popover. The sheet uses the large radius.',
    },
    {
      name: '--ck-menu-shadow',
      fallback: 'var(--ck-shadow-md), in the sheet var(--ck-shadow-lg)',
      description: 'Shadow of the menu.',
    },
    {
      name: '--ck-menu-min-width',
      fallback: '12rem',
      description:
        'Least width of the popover. It is not matched to the button, which is often an icon.',
    },
    {
      name: '--ck-menu-max-height',
      fallback: '20rem',
      description:
        'Height at which the popover starts to scroll. The sheet is as tall as it needs.',
    },
    {
      name: '--ck-menu-item-bg-active',
      fallback: 'var(--ck-color-surface-hover)',
      description:
        'Fill of the focused item. The focus is also marked with a bar at the inline start, so colour is never the only sign.',
    },
    {
      name: '--ck-menu-item-fg-danger',
      fallback: 'var(--ck-color-danger-fg)',
      description: 'Text of a danger item. Keep it 4.5:1 on the menu fill.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-surface-raised, --ck-color-surface-hover, --ck-color-border-subtle, --ck-color-danger-fg, --ck-color-fg, --ck-color-fg-disabled, --ck-color-focus-ring, --ck-color-scheme',
    '--ck-target-min, --ck-radius-md, --ck-radius-xl, --ck-space-1, --ck-space-2, --ck-shadow-md, --ck-shadow-lg',
    '--ck-control-height-md, --ck-control-padding-inline-md, --ck-control-font-size-md, --ck-font-weight-semibold, --ck-font-variant-numeric, --ck-line-height-tight',
  ];
}
