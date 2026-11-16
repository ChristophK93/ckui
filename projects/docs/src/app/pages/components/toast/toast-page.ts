import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CkButton } from '@ckui/core/button';
import { CkToast, CkToastDismissReason, CkToastOptions, CkToastRef } from '@ckui/core/toast';
import { SAMPLES } from './toast-samples';

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

@Component({
  selector: 'docs-toast-page',
  imports: [CkButton, RouterLink],
  styleUrl: './toast-page.css',
  templateUrl: './toast-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastPage {
  protected readonly samples = SAMPLES;

  private readonly toast = inject(CkToast);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  protected readonly status = signal('Nothing archived yet');
  protected readonly lastReason = signal<CkToastDismissReason | null>(null);
  protected readonly connected = signal(true);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.timers.forEach(clearTimeout);
      this.toast.dismissAll();
    });
  }

  protected readonly options: readonly OptionRow[] = [
    {
      name: 'message',
      on: 'CkToastOptions',
      type: 'string',
      defaultValue: 'required',
      description:
        'The text. Plain text, never parsed as HTML. A blank message without a title shows nothing.',
    },
    {
      name: 'title',
      on: 'CkToastOptions',
      type: 'string',
      defaultValue: 'none',
      description: 'A short bold line above the message. Announced before it.',
    },
    {
      name: 'tone',
      on: 'CkToastOptions',
      type: "'neutral' | 'success' | 'warning' | 'danger'",
      defaultValue: "'neutral'",
      description:
        'The icon, its colour and, for danger, the fill. Danger is announced assertively, the others politely.',
    },
    {
      name: 'action',
      on: 'CkToastOptions',
      type: '{ label: string; run: () => void }',
      defaultValue: 'none',
      description:
        'A button next to the text. It calls run() and then closes the toast with the reason action. An action without a label or a function is left out.',
    },
    {
      name: 'duration',
      on: 'CkToastOptions',
      type: 'number | null',
      defaultValue: '5000, or until dismissed',
      description:
        'Milliseconds until the toast closes itself. Without a duration, a toast with an action or the tone danger stays until it is dismissed (WCAG 2.2.1). null, 0, a negative or a non-finite number also mean until dismissed.',
    },
    {
      name: 'id',
      on: 'CkToastOptions',
      type: 'string',
      defaultValue: 'none',
      description:
        'A toast with the id of one that is still open replaces it in place: no second toast, the timer starts again. The earlier ref reports replaced and the new ref controls the toast. Identical text at the same urgency is not announced twice.',
    },
    {
      name: 'dismiss()',
      on: 'CkToastRef',
      type: '() => void',
      defaultValue: '',
      description:
        'Closes the toast with the reason programmatic. Does nothing once it is closed or replaced.',
    },
    {
      name: 'update(options)',
      on: 'CkToastRef',
      type: '(options: Partial<CkToastOptions>) => void',
      defaultValue: '',
      description:
        'Changes the shown content and starts the timer again. A key passed as undefined removes the title or the action, or restores the default duration. Text that changes is announced again. The id cannot change.',
    },
    {
      name: 'dismissed',
      on: 'CkToastRef',
      type: "Promise<'timeout' | 'user' | 'action' | 'replaced' | 'programmatic'>",
      defaultValue: '',
      description:
        'Resolves once with the reason the toast closed, also for a toast that never left the queue.',
    },
    {
      name: 'show(options)',
      on: 'CkToast',
      type: '(options: CkToastOptions) => CkToastRef',
      defaultValue: '',
      description:
        'Shows a toast. On the server nothing is shown and the ref resolves as programmatic at once.',
    },
    {
      name: 'dismissAll()',
      on: 'CkToast',
      type: '() => void',
      defaultValue: '',
      description: 'Closes every toast, queued ones included, with the reason programmatic.',
    },
    {
      name: 'position',
      on: 'provideCkToast',
      type: "'top' | 'bottom'",
      defaultValue: "'bottom'",
      description:
        'The screen edge the stack sits against. The newest toast is always nearest the edge.',
    },
    {
      name: 'align',
      on: 'provideCkToast',
      type: "'center' | 'end'",
      defaultValue: 'center on a narrow screen, end otherwise',
      description:
        'Where the stack sits along the edge. The default follows the screen width, also while the window is resized. A narrow screen (below the sheet breakpoint of provideCkui) always gets full-width toasts with a 1rem gutter.',
    },
    {
      name: 'max',
      on: 'provideCkToast',
      type: 'number',
      defaultValue: '3',
      description:
        'How many toasts show at once. Later ones queue, announce themselves and start their timer when a slot frees. A whole number of at least 1.',
    },
    {
      name: 'size',
      on: 'provideCkToast',
      type: "'sm' | 'md' | 'lg' | 'xl'",
      defaultValue: 'the size from provideCkui()',
      description:
        'The size of the action and dismiss buttons. At xl they are 60px high; under a coarse pointer sm and md are 44px.',
    },
  ];

  protected readonly parts: readonly PartRow[] = [
    {
      name: 'CkToast',
      description:
        'The service. Inject it anywhere; the first show() adds one section to the page.',
    },
    {
      name: 'CkToastRef',
      description: 'What show() returns: dismiss(), update() and the dismissed promise.',
    },
    {
      name: 'provideCkToast',
      description: 'Optional app-wide settings, next to provideCkui().',
    },
    {
      name: 'section.ck-toast-host',
      description:
        'The one container, a direct child of body, labelled with the notifications label. It is exempt from inert, so toasts stay usable while a dialog is open.',
    },
    {
      name: '.ck-toast',
      description:
        'One toast, with the modifiers ck-toast--neutral, --success, --warning and --danger. Inside: .ck-toast__icon, .ck-toast__text (.ck-toast__title and .ck-toast__message), .ck-toast__action and .ck-toast__dismiss.',
    },
  ];

  protected readonly keys: readonly KeyRow[] = [
    {
      keys: ['Tab', 'Shift+Tab'],
      action:
        'Moves between the toasts’ buttons in page order: the action, then the dismiss button, toast by toast. The toasts come last on the page.',
    },
    {
      keys: ['Enter', 'Space'],
      action: 'Activates the focused button: runs the action, or dismisses the toast.',
    },
  ];

  protected readonly tokens: readonly TokenRow[] = [
    {
      name: '--ck-toast-bg',
      fallback: 'var(--ck-color-surface-raised)',
      description:
        'Fill of the neutral, success and warning toasts. The danger toast does not read it.',
    },
    {
      name: '--ck-toast-fg',
      fallback: 'var(--ck-color-fg)',
      description:
        'Text colour of the neutral, success and warning toasts. Keep it at 4.5:1 on the fill.',
    },
    {
      name: '--ck-toast-danger-bg',
      fallback: 'var(--ck-color-danger)',
      description: 'Fill of the danger toast.',
    },
    {
      name: '--ck-toast-danger-fg',
      fallback: 'var(--ck-color-on-danger)',
      description:
        'Text colour of the danger toast, and the colour of its buttons and focus ring. Keep it at 4.5:1 on the danger fill.',
    },
    {
      name: '--ck-toast-radius',
      fallback: 'var(--ck-radius-lg)',
      description: 'Corner radius of the toast.',
    },
    {
      name: '--ck-toast-max-width',
      fallback: '28rem',
      description: 'Width of the toast on a wide screen. A narrow screen uses the full width.',
    },
    {
      name: '--ck-toast-shadow',
      fallback: 'var(--ck-shadow-lg)',
      description: 'Shadow under the toast.',
    },
  ];

  protected readonly semanticTokens: readonly string[] = [
    '--ck-color-surface-raised, --ck-color-fg, --ck-color-fg-muted, --ck-color-border-subtle, --ck-color-scheme',
    '--ck-color-success, --ck-color-warning-fg, --ck-color-primary-fg',
    '--ck-color-danger, --ck-color-danger-hover, --ck-color-danger-active, --ck-color-on-danger',
    '--ck-color-surface-hover, --ck-color-surface-active, --ck-shadow-lg, --ck-radius-lg',
    '--ck-control-height-*, --ck-control-padding-inline-*, --ck-control-font-size-*, --ck-control-radius',
    '--ck-focus-ring, --ck-space-1 to --ck-space-4, --ck-font-sans, --ck-font-size-md, --ck-font-size-xl',
    '--ck-font-weight-medium, --ck-font-weight-semibold, --ck-font-variant-numeric, --ck-line-height-*',
    '--ck-duration-normal, --ck-ease-standard, --ck-ease-emphasized, --ck-z-toast',
  ];

  protected showSaved(): void {
    this.open({ tone: 'success', title: 'Saved', message: 'Your changes are stored.' });
  }

  protected showInfo(): void {
    this.open({ message: 'The report will be ready in a minute.' });
  }

  protected showWarning(): void {
    this.open({ tone: 'warning', message: 'You are offline. Changes wait for a connection.' });
  }

  protected showDanger(): void {
    this.open({ tone: 'danger', title: 'Upload failed', message: 'The file is too large.' });
  }

  protected archive(): void {
    this.status.set('Archived');
    this.open({
      message: 'Message archived',
      action: { label: 'Undo', run: () => this.status.set('Restored') },
    });
  }

  protected disconnect(): void {
    this.connected.set(false);
    this.open({
      id: 'bike',
      tone: 'warning',
      message: 'Bike disconnected',
      duration: null,
    });
  }

  protected reconnect(): void {
    this.connected.set(true);
    this.open({ id: 'bike', tone: 'success', message: 'Bike reconnected' });
  }

  protected upload(): void {
    const ref = this.open({ message: 'Uploading 0 of 3 files', duration: null });
    this.timers.add(
      setTimeout(() => {
        ref.update({ tone: 'success', message: 'Uploaded 3 files', duration: 4000 });
      }, 1500),
    );
  }

  protected burst(): void {
    for (let number = 1; number <= 5; number++) {
      this.open({ message: `Notice ${number}`, duration: 8000 });
    }
  }

  protected dismissAll(): void {
    this.toast.dismissAll();
  }

  protected showLong(): void {
    this.open({
      tone: 'warning',
      title: 'A very long title that has to wrap onto several lines on a small screen',
      message:
        'A message that goes on and on: ' +
        'the quick brown fox jumps over the lazy dog, '.repeat(12) +
        'and a last word, Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious.',
      action: { label: 'Read the whole report', run: () => undefined },
    });
  }

  /** Shows the toast and remembers why it closed, for the output under the demos. */
  private open(options: CkToastOptions): CkToastRef {
    const ref = this.toast.show(options);
    void ref.dismissed.then((reason) => this.lastReason.set(reason));
    return ref;
  }
}
