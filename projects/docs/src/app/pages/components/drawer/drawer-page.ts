import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CK_DRAWER_IMPORTS, CkDrawer, CkDrawerMode, CkDrawerSide } from '@ckui/core/drawer';
import { CalibrationDemo, DeviceDemo } from './drawer-demos';
import { SAMPLES } from './drawer-samples';

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
      name: 'side',
      on,
      type: "'start' | 'end'",
      defaultValue: "'end'",
      description:
        'The edge a side panel slides in from. end is the right edge in a left-to-right page and the left edge in a right-to-left one. A sheet ignores it.',
    },
    {
      name: 'mode',
      on,
      type: "'auto' | 'side' | 'sheet'",
      defaultValue: "'auto'",
      description:
        'auto opens a bottom sheet on a narrow screen with a coarse pointer and a full-height side panel otherwise, decided when the drawer opens.',
    },
    {
      name: 'width',
      on,
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description:
        'Inline size of a side panel: 20, 24 or 32rem, and never wider than the screen minus a margin. A sheet is as wide as the screen.',
    },
    {
      name: 'role',
      on,
      type: "'dialog' | 'alertdialog'",
      defaultValue: "'dialog'",
      description: 'The ARIA role. Use alertdialog for a message the user has to answer.',
    },
    {
      name: 'dismissible',
      on,
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Escape and a click on the backdrop close the drawer, and a swipe down closes a sheet. The close button and ckDialogClose always work.',
    },
    {
      name: 'closeButton',
      on,
      type: 'boolean',
      defaultValue: 'true',
      description: 'Shows the close button at the inline end of the title row.',
    },
    {
      name: 'fullHeight',
      on,
      type: 'boolean',
      defaultValue: 'false',
      description:
        'A sheet as tall as the screen allows instead of as tall as its content. A side panel is always full height.',
    },
    {
      name: 'ariaLabel',
      on,
      type: 'string',
      defaultValue: 'none',
      description:
        'The accessible name of a drawer whose content has no ckDialogTitle. A title wins when both exist.',
    },
  ];
};

@Component({
  selector: 'docs-drawer-page',
  imports: [CkButton, RouterLink, CK_DRAWER_IMPORTS],
  styleUrl: './drawer-page.css',
  templateUrl: './drawer-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerPage {
  protected readonly samples = SAMPLES;

  private readonly drawer = inject(CkDrawer);

  protected readonly device = signal('none');
  protected readonly settingsOpen = signal(false);
  protected readonly settingsResult = signal('nothing yet');
  protected readonly lastOpened = signal('nothing yet');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.drawer.closeAll());
  }

  protected readonly options: readonly OptionRow[] = [
    {
      name: 'data',
      on: 'CkDrawerConfig',
      type: 'D',
      defaultValue: 'none',
      description: 'Handed to the content, which injects it with CK_DRAWER_DATA.',
    },
    ...CONFIG_ROWS('CkDrawerConfig'),
    {
      name: 'injector',
      on: 'CkDrawerConfig',
      type: 'Injector',
      defaultValue: 'the app root',
      description:
        'Parent injector of a component drawer, for providers the root does not have. Pass inject(Injector) from the opener. CK_DRAWER_DATA and CkDrawerRef are provided on top; a template keeps its own injector.',
    },
    {
      name: 'open(content, config)',
      on: 'CkDrawer',
      type: '(content: ComponentType | TemplateRef, config?: CkDrawerConfig) => CkDrawerRef',
      defaultValue: '',
      description:
        'Opens a drawer with a component or a template as its content. The content injects CK_DRAWER_DATA and CkDrawerRef. On the server nothing is shown and closed resolves at once.',
    },
    {
      name: 'closeAll()',
      on: 'CkDrawer',
      type: '() => void',
      defaultValue: '',
      description:
        'Closes every open drawer, as if each ref had been closed without a result. Dialogs stay open.',
    },
    {
      name: 'close(result?)',
      on: 'CkDrawerRef',
      type: '(result?: R) => void',
      defaultValue: '',
      description:
        'Closes the drawer. Only the first call counts; later ones do nothing, whatever result they carry. CkDrawerRef is the ref of CkDialog.',
    },
    {
      name: 'closed',
      on: 'CkDrawerRef',
      type: 'Promise<R | undefined>',
      defaultValue: '',
      description:
        'Resolves once, after the drawer has left the screen, with the result. Escape, the backdrop, a swipe and destroying the app resolve it with undefined.',
    },
    {
      name: 'closing',
      on: 'CkDrawerRef',
      type: 'Promise<void>',
      defaultValue: '',
      description: 'Resolves once, the moment the drawer starts to close, whatever the cause.',
    },
    {
      name: 'open',
      on: 'ck-drawer',
      type: 'boolean (model)',
      defaultValue: 'false',
      description:
        'Two-way: [(open)]. Opening renders the content; Escape, the backdrop, the close button and ckDialogClose set it back to false.',
    },
    ...CONFIG_ROWS('ck-drawer'),
    {
      name: 'closed',
      on: 'ck-drawer',
      type: 'output<unknown>',
      defaultValue: '',
      description:
        'Emits when the drawer has left the screen, with the result of ckDialogClose or undefined.',
    },
    {
      name: 'CK_DRAWER_DATA',
      on: 'token',
      type: 'InjectionToken<unknown>',
      defaultValue: '',
      description:
        'The data of the config, for a drawer opened with a component. It is the token of CkDialog, so content written for a dialog works in a drawer.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'CK_DRAWER_IMPORTS',
      description:
        'Everything a template needs: ck-drawer and the building blocks below, which are the dialog parts.',
    },
    {
      name: '[ckDialogTitle]',
      description:
        'On a heading. It gets an id (or keeps its own) and names the drawer through aria-labelledby.',
    },
    {
      name: '[ckDialogDescription]',
      description:
        'On the text that explains the drawer. It describes it through aria-describedby.',
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
        'Closes the drawer with the bound value as its result when the element is clicked. A native button without a type becomes type="button".',
    },
    {
      name: '[ckDialogInitialFocus]',
      description: 'Takes focus when the drawer opens.',
    },
    {
      name: '.ck-drawer-panel',
      description:
        'The surface in the overlay: role, aria-modal and the labels are on it. The classes .ck-drawer-panel--sm, --md and --lg carry the width, .ck-overlay--side and .ck-overlay--sheet the shape.',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab', 'Shift+Tab'],
      action:
        'Moves through the drawer and wraps from the last element to the first. The page behind cannot be reached.',
    },
    {
      keys: ['Escape'],
      action:
        'Closes the topmost drawer or dialog when it is dismissible. Its closed resolves with undefined.',
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
      name: '--ck-drawer-bg',
      fallback: 'var(--ck-color-surface-raised)',
      description: 'Fill of the panel, and of the grab area above a sheet.',
    },
    {
      name: '--ck-drawer-width',
      fallback: '20, 24 or 32rem from width',
      description:
        'Inline size of a side panel; it overrides the width option. The screen still caps it.',
    },
    {
      name: '--ck-drawer-padding',
      fallback: 'var(--ck-space-6), var(--ck-space-4) on a sheet',
      description:
        'Space around the content. The safe-area insets of the screen come on top, at the edges the panel touches.',
    },
    {
      name: '--ck-drawer-shadow',
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

  protected async pickDevice(): Promise<void> {
    const ref = this.drawer.open<DeviceDemo, { devices: string[] }, string>(DeviceDemo, {
      data: { devices: ['Bike', 'Treadmill'] },
    });
    const result = await ref.closed;
    if (result !== undefined) {
      this.device.set(result);
    }
  }

  protected openAt(side: CkDrawerSide): void {
    void this.drawer
      .open(CalibrationDemo, { side, width: 'sm' })
      .closed.then(() => this.lastOpened.set(`closed the drawer from the ${side}`));
  }

  protected openAs(mode: CkDrawerMode): void {
    void this.drawer
      .open(CalibrationDemo, { mode, width: 'sm' })
      .closed.then(() => this.lastOpened.set(`closed the ${mode} drawer`));
  }

  protected openFullHeight(): void {
    this.drawer.open(CalibrationDemo, { mode: 'sheet', fullHeight: true });
  }

  protected onSettingsClosed(result: unknown): void {
    this.settingsResult.set(result === undefined ? 'dismissed' : String(result));
  }
}
