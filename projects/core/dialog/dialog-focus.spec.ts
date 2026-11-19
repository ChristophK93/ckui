import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CkToast } from '@ckui/core/toast';
import { vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { panel, panels, resetEnvironment, settle, setup, wait } from '../testing/dialog-env';
import { CK_DIALOG_IMPORTS, CkDialog } from './index';

@Component({
  selector: 'ck-test-plain',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>Plain</h2>
    <ck-dialog-body><input class="field" aria-label="Name" /></ck-dialog-body>
    <ck-dialog-actions>
      <button type="button" class="cancel" ckDialogClose>Cancel</button>
      <button type="button" class="confirm" ckDialogClose="yes">Delete</button>
    </ck-dialog-actions>
  `,
})
class Plain {}

@Component({
  selector: 'ck-test-marked',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>Marked</h2>
    <ck-dialog-body><input class="field" aria-label="Name" /></ck-dialog-body>
    <ck-dialog-actions>
      <button type="button" class="confirm" ckDialogClose="yes">Delete</button>
      <button type="button" class="cancel" ckDialogClose ckDialogInitialFocus>Keep</button>
    </ck-dialog-actions>
  `,
})
class Marked {}

@Component({
  selector: 'ck-test-marked-disabled',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>Marked but disabled</h2>
    <ck-dialog-actions>
      <button type="button" class="first">First</button>
      <button type="button" class="marked" disabled ckDialogInitialFocus>Marked</button>
    </ck-dialog-actions>
  `,
})
class MarkedDisabled {}

@Component({
  selector: 'ck-test-text-only',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>Only text</h2>
    <ck-dialog-body>Nothing to press in here.</ck-dialog-body>
  `,
})
class TextOnly {}

@Component({
  selector: 'ck-test-long',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>Long</h2>
    <ck-dialog-body><div style="block-size: 2000px">Tall</div></ck-dialog-body>
    <ck-dialog-actions
      ><button type="button" class="ok" ckDialogClose>Ok</button></ck-dialog-actions
    >
  `,
})
class Long {}

@Component({
  selector: 'ck-test-opens-another',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>Outer</h2>
    <ck-dialog-actions>
      <button type="button" class="inner-opener" (click)="openInner()">More</button>
    </ck-dialog-actions>
  `,
})
class OpensAnother {
  private readonly dialog = inject(CkDialog);

  protected openInner(): void {
    this.dialog.open(Plain, { mode: 'modal' });
  }
}

describe('CkDialog focus', () => {
  let opener: HTMLButtonElement;

  beforeEach(() => {
    setup();
    document.body.innerHTML = `<main id="app"><button id="opener" type="button">Open</button></main>`;
    opener = document.querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await wait(0);
    resetEnvironment();
    await page.viewport(800, 600);
  });

  const dialog = () => TestBed.inject(CkDialog);

  async function open(content: Parameters<CkDialog['open']>[0], mode: 'modal' | 'sheet' = 'modal') {
    const ref = dialog().open(content, { mode });
    await settle();
    return ref;
  }

  const inPanel = <T extends HTMLElement>(selector: string): T =>
    panel()!.querySelector<T>(selector)!;
  const press = (key: string): void => {
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  };

  describe('initial focus', () => {
    it('goes to the element with ckDialogInitialFocus, not the first one', async () => {
      await open(Marked);
      expect(document.activeElement).toBe(inPanel('.cancel'));
    });

    it('goes to the first tabbable element of the body and actions, not the close button', async () => {
      await open(Plain);
      expect(document.activeElement).toBe(inPanel('.field'));
      expect(document.activeElement).not.toBe(inPanel('.ck-dialog__close'));
    });

    it('goes to the panel when the content has nothing to press, although the close button exists', async () => {
      await open(TextOnly);
      expect(inPanel('.ck-dialog__close')).not.toBeNull();
      expect(document.activeElement).toBe(panel());
    });

    it('goes to the panel when there is no close button and nothing to press', async () => {
      dialog().open(TextOnly, { mode: 'modal', closeButton: false });
      await settle();
      expect(document.activeElement).toBe(panel());
    });

    it('skips a marked element that cannot take focus and uses the first tabbable one', async () => {
      await open(MarkedDisabled);
      expect(document.activeElement).toBe(inPanel('.first'));
    });

    it('does not pick the scrolling body even though it is tabbable', async () => {
      await page.viewport(600, 400);
      await open(Long);
      expect(inPanel('.ck-dialog-body').getAttribute('tabindex')).toBe('0');
      expect(document.activeElement).toBe(inPanel('.ok'));
    });
  });

  describe('keyboard', () => {
    it('traps Tab inside the dialog, with the close button last', async () => {
      await open(Plain);
      const stops: Element[] = [];
      for (let step = 0; step < 4; step++) {
        stops.push(document.activeElement!);
        await userEvent.tab();
      }
      expect(stops).toEqual([
        inPanel('.field'),
        inPanel('.cancel'),
        inPanel('.confirm'),
        inPanel('.ck-dialog__close'),
      ]);
      expect(document.activeElement).toBe(inPanel('.field'));
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(inPanel('.ck-dialog__close'));
    });

    it('makes the page behind inert, so focus can not leave', async () => {
      await open(Plain);
      expect(document.querySelector('#app')!.hasAttribute('inert')).toBe(true);
      opener.focus();
      expect(document.activeElement).not.toBe(opener);
    });
  });

  describe('restoring focus', () => {
    it('returns to the opener after a result, Escape, the backdrop and the close button', async () => {
      for (const how of ['result', 'escape', 'backdrop', 'close'] as const) {
        opener.focus();
        const ref = await open(Plain);
        expect(document.activeElement).toBe(inPanel('.field'));
        if (how === 'result') {
          inPanel('.confirm').click();
        } else if (how === 'escape') {
          press('Escape');
        } else if (how === 'backdrop') {
          document.querySelector<HTMLElement>('.ck-overlay-backdrop')!.click();
        } else {
          inPanel('.ck-dialog__close').click();
        }
        await ref.closed;
        expect(document.activeElement, how).toBe(opener);
      }
    });

    it('does not throw and leaves focus on the body when the opener has gone and nothing is underneath', async () => {
      const ref = await open(Plain);
      opener.remove();
      ref.close();
      await expect(ref.closed).resolves.toBeUndefined();
      expect(document.activeElement).toBe(document.body);
    });

    it('gives focus back to the first dialog when a dialog on top of it closes', async () => {
      const outer = await open(OpensAnother);
      const outerButton = inPanel<HTMLButtonElement>('.inner-opener');
      outerButton.focus();
      outerButton.click();
      await settle();
      expect(panels()).toHaveLength(2);
      expect(panels()[1].contains(document.activeElement)).toBe(true);
      press('Escape');
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      expect(document.activeElement).toBe(outerButton);
      outer.close();
      await outer.closed;
      expect(document.activeElement).toBe(opener);
    });

    it('returns to the opener when the lower of two dialogs is closed first, then the upper', async () => {
      const lower = await open(Plain);
      const upper = await open(Plain);
      lower.close();
      await lower.closed;
      upper.close();
      await upper.closed;
      expect(document.activeElement).toBe(opener);
    });
  });

  describe('opened from a toast', () => {
    it('opens over a visible toast that stays clickable, and takes focus into the dialog', async () => {
      const toast = TestBed.inject(CkToast);
      toast.show({ message: 'Other news', duration: null });
      toast.show({
        message: 'Workout saved',
        duration: null,
        action: { label: 'Details', run: () => void dialog().open(Plain, { mode: 'modal' }) },
      });
      await settle();
      const action = document.querySelector<HTMLButtonElement>('.ck-toast__action')!;
      action.focus();
      action.click();
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      await settle();
      expect(panel()!.contains(document.activeElement)).toBe(true);
      const remaining = document.querySelector<HTMLElement>('.ck-toast .ck-toast__dismiss')!;
      expect(remaining.closest('[inert]')).toBeNull();
      const box = remaining.getBoundingClientRect();
      expect(
        remaining.contains(
          document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2),
        ),
      ).toBe(true);
      remaining.click();
      await settle();
      expect(panels()).toHaveLength(1);
      expect(panel()!.contains(document.activeElement)).toBe(true);
    });
  });
});
