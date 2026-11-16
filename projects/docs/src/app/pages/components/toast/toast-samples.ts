/** A complete component around a template and a body, so every sample compiles as copied. */
function component(
  className: string,
  selector: string,
  template: string,
  body: string,
  options: { signals?: boolean; destroy?: boolean } = {},
): string {
  const core = ['Component', 'inject', ...(options.destroy ? ['DestroyRef'] : [])];
  if (options.signals) {
    core.push('signal');
  }
  const indented = template
    .split('\n')
    .map((line) => (line === '' ? '' : `    ${line}`))
    .join('\n');
  return `import { ${core.sort().join(', ')} } from '@angular/core';
import { CkButton } from '@ckui/core/button';
import { CkToast } from '@ckui/core/toast';

@Component({
  selector: '${selector}',
  imports: [CkButton],
  template: \`
${indented}
  \`,
})
export class ${className} {
${body}
}`;
}

/** Code shown on the toast page. Plain text, rendered through interpolation so no escaping is needed. */
export const SAMPLES = {
  basics: component(
    'Notices',
    'app-notices',
    `<button ckButton (click)="saved()">Saved</button>
<button ckButton (click)="warn()">Warning</button>
<button ckButton (click)="fail()">Danger</button>`,
    `  private readonly toast = inject(CkToast);

  protected saved(): void {
    this.toast.show({ tone: 'success', title: 'Saved', message: 'Your changes are stored.' });
  }

  protected warn(): void {
    this.toast.show({ tone: 'warning', message: 'You are offline. Changes wait for a connection.' });
  }

  protected fail(): void {
    // danger stays until dismissed and is announced assertively
    this.toast.show({ tone: 'danger', title: 'Upload failed', message: 'The file is too large.' });
  }`,
  ),
  action: component(
    'Archive',
    'app-archive',
    `<button ckButton (click)="archive()">Archive message</button>
<p>{{ status() }}</p>`,
    `  private readonly toast = inject(CkToast);
  protected readonly status = signal('');

  protected archive(): void {
    this.status.set('Archived');
    const ref = this.toast.show({
      message: 'Message archived',
      // an action keeps the toast open until it is used or dismissed
      action: { label: 'Undo', run: () => this.status.set('Restored') },
    });
    void ref.dismissed.then((reason) => console.log('closed because of', reason));
  }`,
    { signals: true },
  ),
  replace: component(
    'Bike',
    'app-bike',
    `<button ckButton (click)="disconnect()">Disconnect</button>
<button ckButton (click)="reconnect()">Reconnect</button>`,
    `  private readonly toast = inject(CkToast);

  protected disconnect(): void {
    this.toast.show({ id: 'bike', tone: 'warning', message: 'Bike disconnected', duration: null });
  }

  protected reconnect(): void {
    // the same id replaces the open toast in place: one toast, and the timer starts again
    this.toast.show({ id: 'bike', tone: 'success', message: 'Bike reconnected' });
  }`,
  ),
  update: component(
    'Upload',
    'app-upload',
    `<button ckButton (click)="upload()">Upload</button>`,
    `  private readonly toast = inject(CkToast);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach(clearTimeout));
  }

  protected upload(): void {
    const ref = this.toast.show({ message: 'Uploading 0 of 3 files', duration: null });
    const finish = setTimeout(() => {
      // changed text is announced again, and the timer starts from the full duration
      ref.update({ tone: 'success', message: 'Uploaded 3 files', duration: 4000 });
    }, 1500);
    this.timers.add(finish);
  }`,
    { destroy: true },
  ),
  queue: component(
    'Burst',
    'app-burst',
    `<button ckButton (click)="burst()">Show five</button>
<button ckButton (click)="toast.dismissAll()">Dismiss all</button>`,
    `  protected readonly toast = inject(CkToast);

  protected burst(): void {
    // three show at once, the others wait for a free slot
    for (let number = 1; number <= 5; number++) {
      this.toast.show({ message: 'Notice ' + number, duration: 8000 });
    }
  }`,
  ),
  config: `import { ApplicationConfig } from '@angular/core';
import { provideCkToast } from '@ckui/core/toast';

export const appConfig: ApplicationConfig = {
  providers: [
    provideCkToast({
      position: 'top', // 'bottom' is the default
      align: 'center', // default: 'center' on a narrow screen, 'end' otherwise
      max: 2, // toasts shown at once, default 3
      size: 'lg', // size of the action and dismiss buttons, default: the size from provideCkui()
    }),
  ],
};`,
  reasons: component(
    'Reasons',
    'app-reasons',
    `<button ckButton (click)="archive()">Archive message</button>`,
    `  private readonly toast = inject(CkToast);

  protected async archive(): Promise<void> {
    const ref = this.toast.show({
      message: 'Message archived',
      action: { label: 'Undo', run: () => this.restore() },
    });

    switch (await ref.dismissed) {
      case 'action': // the Undo button was used; run() has already been called
      case 'user': // the dismiss button, or a swipe
      case 'timeout': // the duration ran out
      case 'replaced': // another show() with the same id took its place
      case 'programmatic': // ref.dismiss(), toast.dismissAll(), or the app was destroyed
        break;
    }
  }

  private restore(): void {
    // put the message back
  }`,
  ),
  reset: `/* A global rule such as this beats the layered toast and draws a second ring on its buttons: */
button:focus-visible {
  outline: 2px solid currentColor;
}

/* Declare resets in a layer before ckui, so the toast's layered rules win over them: */
@layer reset, ckui;

@layer reset {
  button:focus-visible {
    outline: 2px solid currentColor;
  }
}`,
  tokens: `/* in your app: every toast */
:root {
  --ck-toast-radius: var(--ck-radius-sm);
  --ck-toast-max-width: 24rem;
  --ck-toast-shadow: none;

  /* neutral, success and warning toasts; keep the text at 4.5:1 on the fill */
  --ck-toast-bg: var(--ck-color-surface);
  --ck-toast-fg: var(--ck-color-fg);

  /* the danger toast has its own pair */
  --ck-toast-danger-bg: var(--ck-color-danger-hover);
  --ck-toast-danger-fg: var(--ck-color-on-danger);
}`,
};
