import {
  ApplicationRef,
  Component,
  PLATFORM_ID,
  TemplateRef,
  WritableSignal,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { expectNoAxeViolations } from '../testing/axe';
import {
  DIALOG_DARK,
  panel,
  panels,
  resetEnvironment,
  settle,
  setup,
  wait,
} from '../testing/dialog-env';
import { CK_DIALOG_DATA, CK_DIALOG_IMPORTS, CkDialog, CkDialogRef } from './index';

interface ConfirmData {
  readonly title?: string;
  readonly showTitle?: WritableSignal<boolean>;
}

@Component({
  selector: 'ck-test-confirm',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    @if (showTitle()) {
      <h2 ckDialogTitle>{{ data.title ?? 'Delete workout?' }}</h2>
    }
    <p ckDialogDescription>It cannot be undone.</p>
    <ck-dialog-body><p>Body text</p></ck-dialog-body>
    <ck-dialog-actions>
      <button type="button" class="cancel" [ckDialogClose]="'cancel'">Cancel</button>
      <button type="button" class="confirm" [ckDialogClose]="true">Delete</button>
    </ck-dialog-actions>
  `,
})
class Confirm {
  protected readonly data = inject<ConfirmData | undefined>(CK_DIALOG_DATA) ?? {};
  protected readonly showTitle = this.data.showTitle ?? signal(true);
}

@Component({
  selector: 'ck-test-unnamed',
  imports: [CK_DIALOG_IMPORTS],
  template: `<ck-dialog-body>Nothing names me</ck-dialog-body>`,
})
class Unnamed {}

@Component({ selector: 'ck-test-eager', template: `<p>Closes itself</p>` })
class Eager {
  constructor() {
    inject(CkDialogRef).close('early');
  }
}

@Component({
  selector: 'ck-test-existing-id',
  imports: [CK_DIALOG_IMPORTS],
  template: `<h2 ckDialogTitle id="my-title">Mine</h2>`,
})
class ExistingId {}

@Component({
  selector: 'ck-test-form',
  imports: [CK_DIALOG_IMPORTS],
  template: `<form>
    <h2 ckDialogTitle>Form</h2>
    <button ckDialogClose>Close</button>
  </form>`,
})
class FormContent {}

@Component({
  imports: [CK_DIALOG_IMPORTS],
  template: `<ng-template #template>
    <h2 ckDialogTitle>From a template</h2>
    <ck-dialog-actions
      ><button type="button" class="save" ckDialogClose="saved">Save</button></ck-dialog-actions
    >
  </ng-template>`,
})
class TemplateHost {
  readonly template = viewChild.required<TemplateRef<unknown>>('template');
}

describe('CkDialog service', () => {
  beforeEach(() => setup());

  afterEach(async () => {
    TestBed.resetTestingModule();
    await wait(0);
    resetEnvironment();
    vi.restoreAllMocks();
  });

  const dialog = () => TestBed.inject(CkDialog);

  async function open<R = unknown>(
    config: Parameters<CkDialog['open']>[1] = {},
    content: Parameters<CkDialog['open']>[0] = Confirm,
  ): Promise<CkDialogRef<R>> {
    const ref = dialog().open<unknown, unknown, R>(content, { mode: 'modal', ...config });
    await settle();
    return ref;
  }

  const press = (key: string): void => {
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  };

  describe('opening', () => {
    it('shows a component with role, aria-modal, title and description names, and data injected', async () => {
      await open({ data: { title: 'Remove it?' } satisfies ConfirmData });
      const element = panel()!;
      const title = element.querySelector<HTMLElement>('h2')!;
      const description = element.querySelector<HTMLElement>('p.ck-dialog__description')!;
      expect(title.textContent).toBe('Remove it?');
      expect(element.getAttribute('role')).toBe('dialog');
      expect(element.getAttribute('aria-modal')).toBe('true');
      expect(title.id).not.toBe('');
      expect(description.id).not.toBe('');
      expect(element.getAttribute('aria-labelledby')).toBe(title.id);
      expect(element.getAttribute('aria-describedby')).toBe(description.id);
    });

    it('opens a template with CkDialogRef available to its content', async () => {
      const fixture = TestBed.createComponent(TemplateHost);
      fixture.detectChanges();
      const ref = dialog().open<unknown, unknown, string>(fixture.componentInstance.template(), {
        mode: 'modal',
      });
      await settle();
      expect(panel()!.querySelector('h2')!.textContent).toBe('From a template');
      expect(panel()!.getAttribute('aria-labelledby')).toBe(panel()!.querySelector('h2')!.id);
      panel()!.querySelector<HTMLButtonElement>('button.save')!.click();
      await expect(ref.closed).resolves.toBe('saved');
      expect(panel()).toBeNull();
    });

    it('keeps an id the heading already has', async () => {
      await open({}, ExistingId);
      expect(panel()!.querySelector('h2')!.id).toBe('my-title');
      expect(panel()!.getAttribute('aria-labelledby')).toBe('my-title');
    });

    it('names the panel when the title appears later and drops the name when it goes', async () => {
      const showTitle = signal(false);
      await open({ ariaLabel: 'Fallback', data: { showTitle } satisfies ConfirmData });
      expect(panel()!.hasAttribute('aria-labelledby')).toBe(false);
      expect(panel()!.getAttribute('aria-label')).toBe('Fallback');
      showTitle.set(true);
      await settle();
      expect(panel()!.getAttribute('aria-labelledby')).toBe(panel()!.querySelector('h2')!.id);
      showTitle.set(false);
      await settle();
      expect(panel()!.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('supports alertdialog and leaves it dismissible unless the config says otherwise', async () => {
      const ref = await open({ role: 'alertdialog' });
      expect(panel()!.getAttribute('role')).toBe('alertdialog');
      press('Escape');
      await expect(ref.closed).resolves.toBeUndefined();
      const strict = await open({ role: 'alertdialog', dismissible: false });
      press('Escape');
      await settle();
      expect(panel()).not.toBeNull();
      strict.close();
      await strict.closed;
    });

    it('closes by itself when the content closes it while the dialog is still opening', async () => {
      const ref = dialog().open(Eager, { mode: 'modal' });
      await expect(ref.closed).resolves.toBe('early');
      expect(panel()).toBeNull();
    });
  });

  describe('on the server', () => {
    it('shows nothing and resolves closed at once', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
      const ref = dialog().open(Confirm);
      await expect(ref.closed).resolves.toBeUndefined();
      expect(panels()).toHaveLength(0);
      expect(() => ref.close('x')).not.toThrow();
    });
  });

  describe('results', () => {
    it('resolves closed with the result after the dialog is gone', async () => {
      const ref = await open<boolean>();
      let gone = false;
      void ref.closed.then(() => (gone = panel() === null));
      panel()!.querySelector<HTMLButtonElement>('.confirm')!.click();
      await expect(ref.closed).resolves.toBe(true);
      expect(gone).toBe(true);
    });

    it('delivers the result of ckDialogClose, and undefined for the close button', async () => {
      const first = await open<string>();
      panel()!.querySelector<HTMLButtonElement>('.cancel')!.click();
      await expect(first.closed).resolves.toBe('cancel');
      const second = await open<string>();
      panel()!.querySelector<HTMLButtonElement>('.ck-dialog__close')!.click();
      await expect(second.closed).resolves.toBeUndefined();
    });

    it('only counts the first close, however many follow', async () => {
      const ref = await open<string>();
      ref.close('one');
      ref.close('two');
      ref.close();
      await expect(ref.closed).resolves.toBe('one');
      ref.close('three');
      await expect(ref.closed).resolves.toBe('one');
    });

    it('resolves undefined after Escape and after a backdrop click', async () => {
      const byEscape = await open();
      press('Escape');
      await expect(byEscape.closed).resolves.toBeUndefined();
      const byBackdrop = await open();
      document.querySelector<HTMLElement>('.ck-overlay-backdrop')!.click();
      await expect(byBackdrop.closed).resolves.toBeUndefined();
    });

    it('ignores Escape and the backdrop when not dismissible, but not the close button', async () => {
      const ref = await open({ dismissible: false });
      press('Escape');
      document.querySelector<HTMLElement>('.ck-overlay-backdrop')!.click();
      await settle();
      expect(panel()).not.toBeNull();
      expect(panel()!.querySelector('.ck-overlay-grab')).toBeNull();
      panel()!.querySelector<HTMLButtonElement>('.ck-dialog__close')!.click();
      await expect(ref.closed).resolves.toBeUndefined();
    });

    it('has no close button with closeButton: false, and reserves no room for it', async () => {
      await open({ closeButton: false });
      expect(panel()!.querySelector('.ck-dialog__close')).toBeNull();
      expect(panel()!.querySelector('.ck-dialog--has-close')).toBeNull();
    });

    it('shows a named close button after the content', async () => {
      await open();
      const close = panel()!.querySelector<HTMLButtonElement>('.ck-dialog__close')!;
      expect(close.getAttribute('aria-label')).toBe('Close');
      const content = panel()!.querySelector('.ck-dialog__content')!;
      expect(
        content.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('does not submit a form from a ckDialogClose button without a type', async () => {
      const submitted = vi.fn((event: Event) => event.preventDefault());
      await open({}, FormContent);
      const form = panel()!.querySelector('form')!;
      form.addEventListener('submit', submitted);
      const button = form.querySelector('button')!;
      expect(button.getAttribute('type')).toBe('button');
      button.click();
      expect(submitted).not.toHaveBeenCalled();
    });
  });

  describe('closeAll and teardown', () => {
    it('closes every dialog and resolves each ref', async () => {
      const refs = [await open(), await open(), await open()];
      expect(panels()).toHaveLength(3);
      dialog().closeAll();
      await expect(Promise.all(refs.map((ref) => ref.closed))).resolves.toEqual([
        undefined,
        undefined,
        undefined,
      ]);
      await settle();
      expect(panels()).toHaveLength(0);
    });

    it('does nothing for closeAll without dialogs', () => {
      expect(() => dialog().closeAll()).not.toThrow();
    });

    it('settles every pending closed promise, removes the DOM and releases inert and the scroll lock on destroy', async () => {
      document.body.insertAdjacentHTML('afterbegin', '<main id="app"><button>Page</button></main>');
      const refs = [await open(), await open()];
      const results: unknown[] = [];
      refs.forEach((ref) => void ref.closed.then((result) => results.push(result)));
      expect(document.querySelector('#app')!.hasAttribute('inert')).toBe(true);
      TestBed.resetTestingModule();
      await Promise.all(refs.map((ref) => ref.closed));
      expect(results).toEqual([undefined, undefined]);
      expect(panels()).toHaveLength(0);
      expect(document.querySelector('#app')!.hasAttribute('inert')).toBe(false);
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(false);
    });

    it('ignores close() on a ref after the service is destroyed', async () => {
      const ref = await open<string>();
      TestBed.resetTestingModule();
      await ref.closed;
      expect(() => ref.close('late')).not.toThrow();
      await expect(ref.closed).resolves.toBeUndefined();
    });
  });

  describe('rapid use', () => {
    it('opens and closes five dialogs in a row without leaving anything behind', async () => {
      document.body.insertAdjacentHTML('afterbegin', '<main id="app"><button>Page</button></main>');
      const refs = Array.from({ length: 5 }, () => dialog().open(Confirm, { mode: 'modal' }));
      refs.forEach((ref) => ref.close());
      await Promise.all(refs.map((ref) => ref.closed));
      await settle();
      expect(panels()).toHaveLength(0);
      expect(document.querySelector('.cdk-overlay-container')!.childElementCount).toBe(0);
      expect(document.querySelector('#app')!.hasAttribute('inert')).toBe(false);
      expect(document.documentElement.classList.contains('cdk-global-scrollblock')).toBe(false);
    });

    it('closes during the opening animation', async () => {
      document.documentElement.style.setProperty('--ck-duration-normal', '300ms');
      const ref = dialog().open(Confirm, { mode: 'modal' });
      await wait(60);
      ref.close('now');
      await expect(ref.closed).resolves.toBe('now');
      await settle();
      expect(panels()).toHaveLength(0);
    });

    it('opens one dialog over another and closes the top one first with Escape', async () => {
      const lower = await open<string>();
      const upper = await open<string>();
      expect(panels()).toHaveLength(2);
      expect(panels()[0].closest('.cdk-global-overlay-wrapper')!.hasAttribute('inert')).toBe(true);
      press('Escape');
      await expect(upper.closed).resolves.toBeUndefined();
      await settle();
      expect(panels()).toHaveLength(1);
      expect(panel()!.closest('.cdk-global-overlay-wrapper')!.hasAttribute('inert')).toBe(false);
      lower.close('lower');
      await expect(lower.closed).resolves.toBe('lower');
    });
  });

  describe('development warning', () => {
    it('warns once for a dialog without title and ariaLabel', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await open({}, Unnamed);
      await settle();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('accessible name');
    });

    it('stays quiet with a title or with an ariaLabel', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await open();
      await open({ ariaLabel: 'Help' }, Unnamed);
      await settle();
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn for a dialog that closed before it finished opening', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const ref = dialog().open(Unnamed, { mode: 'modal' });
      ref.close();
      await ref.closed;
      await settle();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('a11y', () => {
    it('has no axe violations in the light theme', async () => {
      await open();
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });

    it('has no axe violations in the dark theme', async () => {
      setup(DIALOG_DARK);
      await open();
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });
  });

  it('leaves nothing pending after a close', async () => {
    const ref = await open();
    ref.close();
    await ref.closed;
    await TestBed.inject(ApplicationRef).whenStable();
    expect(panels()).toHaveLength(0);
  });
});
