import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_DIALOG_IMPORTS, CkDialog, CkDialogMode } from '@ckui/core/dialog';
import { DeleteDemo, NoteDemo, RenameDemo, TermsDemo } from './dialog-demos';
import { SAMPLES } from './dialog-samples';

interface OptionRow {
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
  readonly keys: readonly string[];
  readonly action: string;
}

interface TokenRow {
  readonly name: string;
  readonly fallback: string;
  readonly description: string;
}

const CONFIG_ROWS = (on: string): OptionRow[] => {
  return [
    {
      name: 'role',
      on,
      type: "'dialog' | 'alertdialog'",
      defaultValue: "'dialog'",
      description: 'The ARIA role. Use alertdialog for a message the user has to answer.',
    },
    {
      name: 'width',
      on,
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description:
        'Largest inline size of a modal dialog: 24, 32 or 48rem, and never wider than the screen. A sheet is as wide as the screen.',
    },
    {
      name: 'dismissible',
      on,
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Escape, a click on the backdrop and a swipe down close the dialog. Also for an alertdialog, unless you set it to false. The close button and ckDialogClose always work.',
    },
    {
      name: 'closeButton',
      on,
      type: 'boolean',
      defaultValue: 'true',
      description: 'Shows the close button at the inline end of the title row.',
    },
    {
      name: 'mode',
      on,
      type: "'auto' | 'modal' | 'sheet'",
      defaultValue: "'auto'",
      description:
        'auto opens a sheet on a narrow screen with a coarse pointer and a centred modal otherwise, decided when the dialog opens.',
    },
    {
      name: 'fullHeight',
      on,
      type: 'boolean',
      defaultValue: 'false',
      description:
        'A sheet as tall as the screen allows instead of as tall as its content. Has no effect on a modal.',
    },
    {
      name: 'ariaLabel',
      on,
      type: 'string',
      defaultValue: 'none',
      description:
        'The accessible name of a dialog whose content has no ckDialogTitle. A title wins when both exist.',
    },
  ];
};

@Component({
  selector: 'docs-dialog-page',
  imports: [CkButton, RouterLink, CK_DIALOG_IMPORTS],
  styleUrl: './dialog-page.css',
  templateUrl: './dialog-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogPage {
  protected readonly samples = SAMPLES;

  private readonly dialog = inject(CkDialog);

  protected readonly workoutName = signal('Leg day');
  protected readonly deleteResult = signal('nothing yet');
  protected readonly termsResult = signal('nothing yet');
  protected readonly settingsOpen = signal(false);
  protected readonly settingsResult = signal('nothing yet');
  protected readonly lastDismissal = signal('nothing yet');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.dialog.closeAll());
  }

  protected readonly options: readonly OptionRow[] = [
    {
      name: 'data',
      on: 'CkDialogConfig',
      type: 'D',
      defaultValue: 'none',
      description: 'Handed to the content, which injects it with CK_DIALOG_DATA.',
    },
    ...CONFIG_ROWS('CkDialogConfig'),
    {
      name: 'injector',
      on: 'CkDialogConfig',
      type: 'Injector',
      defaultValue: 'the app root',
      description:
        'Parent injector of a component dialog, for providers the root does not have. Pass inject(Injector) from the opener. CK_DIALOG_DATA and CkDialogRef are provided on top; a template keeps its own injector.',
    },
    {
      name: 'open(content, config)',
      on: 'CkDialog',
      type: '(content: ComponentType | TemplateRef, config?: CkDialogConfig) => CkDialogRef',
      defaultValue: '',
      description:
        'Opens a dialog with a component or a template as its content. The content injects CK_DIALOG_DATA and CkDialogRef. On the server nothing is shown and closed resolves at once.',
    },
    {
      name: 'closeAll()',
      on: 'CkDialog',
      type: '() => void',
      defaultValue: '',
      description: 'Closes every open dialog, as if each ref had been closed without a result.',
    },
    {
      name: 'close(result?)',
      on: 'CkDialogRef',
      type: '(result?: R) => void',
      defaultValue: '',
      description:
        'Closes the dialog. Only the first call counts; later ones do nothing, whatever result they carry.',
    },
    {
      name: 'closed',
      on: 'CkDialogRef',
      type: 'Promise<R | undefined>',
      defaultValue: '',
      description:
        'Resolves once, after the dialog has left the screen, with the result. Escape, the backdrop, a swipe and destroying the app resolve it with undefined.',
    },
    {
      name: 'open',
      on: 'ck-dialog',
      type: 'boolean (model)',
      defaultValue: 'false',
      description:
        'Two-way: [(open)]. Opening renders the content; Escape, the backdrop, the close button and ckDialogClose set it back to false.',
    },
    ...CONFIG_ROWS('ck-dialog'),
    {
      name: 'closed',
      on: 'ck-dialog',
      type: 'output<unknown>',
      defaultValue: '',
      description:
        'Emits when the dialog has left the screen, with the result of ckDialogClose or undefined.',
    },
    {
      name: 'CK_DIALOG_DATA',
      on: 'token',
      type: 'InjectionToken<unknown>',
      defaultValue: '',
      description: 'The data of the config, for a dialog opened with a component.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'CK_DIALOG_IMPORTS',
      description: 'Everything a template needs: ck-dialog and the building blocks below.',
    },
    {
      name: '[ckDialogTitle]',
      description:
        'On a heading. It gets an id (or keeps its own) and names the dialog through aria-labelledby.',
    },
    {
      name: '[ckDialogDescription]',
      description:
        'On the text that explains the dialog. It describes it through aria-describedby.',
    },
    {
      name: 'ck-dialog-body',
      description:
        'The only part that scrolls. It becomes a tab stop while it scrolls, so the keyboard can reach all of it.',
    },
    {
      name: 'ck-dialog-actions',
      description:
        'The row of buttons at the bottom, aligned to the inline end. On a sheet the buttons stack and fill the width.',
    },
    {
      name: '[ckDialogClose]="result"',
      description:
        'Closes the dialog with the bound value as its result when the element is clicked. A native button without a type becomes type="button".',
    },
    {
      name: '[ckDialogInitialFocus]',
      description: 'Takes focus when the dialog opens.',
    },
    {
      name: '.ck-dialog-panel',
      description:
        'The surface in the overlay: role, aria-modal and the labels are on it. The classes .ck-dialog-panel--sm, --md and --lg carry the width.',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab', 'Shift+Tab'],
      action:
        'Moves through the dialog and wraps from the last element to the first. The page behind cannot be reached.',
    },
    {
      keys: ['Escape'],
      action:
        'Closes the topmost dialog when it is dismissible. Its closed resolves with undefined.',
    },
    {
      keys: ['Enter', 'Space'],
      action: 'Activates the focused button, including the close button.',
    },
    {
      keys: ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'],
      action: 'Scrolls the body while it has focus.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-dialog-bg',
      fallback: 'var(--ck-color-surface-raised)',
      description: 'Fill of the panel, and of the grab area above a sheet.',
    },
    {
      name: '--ck-dialog-radius',
      fallback: 'var(--ck-radius-xl)',
      description: 'Corner radius. A sheet rounds only the top corners.',
    },
    {
      name: '--ck-dialog-padding',
      fallback: 'var(--ck-space-6), var(--ck-space-4) on a sheet',
      description:
        'Space around the content. A sheet adds the bottom safe-area inset to the bottom.',
    },
    {
      name: '--ck-dialog-max-width',
      fallback: '24, 32 or 48rem from width',
      description: 'Largest inline size of a modal; it overrides the width option.',
    },
    {
      name: '--ck-dialog-shadow',
      fallback: 'var(--ck-shadow-lg)',
      description: 'Shadow of the panel.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-surface-raised, --ck-color-fg, --ck-color-fg-muted, --ck-color-border, --ck-color-backdrop, --ck-color-scheme',
    '--ck-radius-xl, --ck-shadow-lg, --ck-space-1 to --ck-space-10',
    '--ck-control-height-md, --ck-target-min, --ck-focus-ring, --ck-focus-ring-width',
    '--ck-font-sans, --ck-font-size-md, --ck-font-size-xl, --ck-font-weight-semibold, --ck-line-height-*',
    '--ck-duration-normal, --ck-ease-standard, --ck-z-overlay',
  ];

  protected async rename(): Promise<void> {
    const ref = this.dialog.open<RenameDemo, { name: string }, string>(RenameDemo, {
      data: { name: this.workoutName() },
    });
    const result = await ref.closed;
    if (result !== undefined) {
      this.workoutName.set(result);
    }
  }

  protected async confirmDelete(): Promise<void> {
    const ref = this.dialog.open<DeleteDemo, void, 'keep' | 'delete'>(DeleteDemo, {
      role: 'alertdialog',
      closeButton: false,
    });
    this.deleteResult.set(String(await ref.closed));
  }

  protected async readTerms(): Promise<void> {
    const ref = this.dialog.open<TermsDemo, void, string>(TermsDemo, { width: 'lg' });
    this.termsResult.set(String(await ref.closed));
  }

  protected openFullHeight(): void {
    this.dialog.open(NoteDemo, { fullHeight: true });
  }

  protected openAs(mode: CkDialogMode): void {
    void this.dialog
      .open(NoteDemo, { mode, width: 'sm' })
      .closed.then(() => this.lastDismissal.set(`closed the ${mode} dialog`));
  }

  protected onSettingsClosed(result: unknown): void {
    this.settingsResult.set(result === undefined ? 'dismissed' : String(result));
  }
}
