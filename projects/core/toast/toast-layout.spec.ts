import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CK_SIZES, CkSize, provideCkui } from '@ckui/core';
import { CkOverlayHost } from '@ckui/core/internal';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { contrastRatio } from '../testing/contrast';
import {
  DARK_TOKENS,
  LIGHT_TOKENS,
  actionOf,
  configure,
  dismissOf,
  flush,
  resetEnvironment,
  setTokens,
  settle,
  spyOnAnnouncements,
  toastHost,
  toastItems,
} from '../testing/toast-env';
import { CkToast, CkToastConfig, provideCkToast } from './index';

@Component({
  template: '<p>Dialog body</p><button type="button" id="dialog-button">Ok</button>',
})
class DialogStub {}

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

const original = { width: 0, height: 0 };

function setup(config?: CkToastConfig, ...extra: Parameters<typeof configure>) {
  setTokens();
  configure(...(config ? [provideCkToast(config)] : []), ...extra);
  spyOnAnnouncements();
  return TestBed.inject(CkToast);
}

const rect = (element: Element) => element.getBoundingClientRect();
const center = (element: Element): [number, number] => {
  const box = rect(element);
  return [box.left + box.width / 2, box.top + box.height / 2];
};
/** True when the element, or something inside it, is what a click at its centre would hit. */
const hits = (element: Element): boolean => {
  const [x, y] = center(element);
  return element.contains(document.elementFromPoint(x, y));
};

describe('CkToast layout', () => {
  afterEach(async () => {
    TestBed.resetTestingModule();
    resetEnvironment();
    await emulate([]);
    if (original.width > 0) {
      await page.viewport(original.width, original.height);
    }
  });

  async function viewport(width: number, height: number): Promise<void> {
    original.width ||= window.innerWidth;
    original.height ||= window.innerHeight;
    await page.viewport(width, height);
  }

  describe('stacking with an open overlay', () => {
    async function openSheet(): Promise<ReturnType<CkOverlayHost['open']>> {
      const background = document.createElement('button');
      background.id = 'background';
      background.textContent = 'Background';
      document.body.appendChild(background);
      const handle = TestBed.inject(CkOverlayHost).open(DialogStub, {
        mode: 'sheet',
        fullHeight: true,
        ariaLabel: 'Dialog',
      });
      await handle.opened;
      return handle;
    }

    it('keeps the toast host out of inert and above the overlay, so its buttons can be clicked', async () => {
      const toast = setup();
      const run = vi.fn();
      const action = toast.show({ message: 'Undo?', action: { label: 'Undo', run } });
      const user = toast.show({ message: 'Other', duration: null });
      flush();
      const handle = await openSheet();
      let overlayClosed = false;
      void handle.closed.then(() => (overlayClosed = true));
      expect(document.getElementById('background')!.hasAttribute('inert')).toBe(true);
      expect(toastHost()!.hasAttribute('inert')).toBe(false);
      const [first, second] = toastItems();
      expect(hits(actionOf(first))).toBe(true);
      expect(hits(dismissOf(second))).toBe(true);

      await userEvent.click(actionOf(first));
      expect(await action.dismissed).toBe('action');
      expect(run).toHaveBeenCalledTimes(1);
      await userEvent.click(dismissOf(second));
      expect(await user.dismissed).toBe('user');
      await settle();
      expect(toastItems()).toHaveLength(0);
      expect(overlayClosed).toBe(false);
      await handle.close();
    });

    it('stays clickable for a toast shown after the overlay opened', async () => {
      const toast = setup();
      const handle = await openSheet();
      const ref = toast.show({ message: 'Late', duration: null });
      flush();
      const [item] = toastItems();
      expect(hits(dismissOf(item))).toBe(true);
      await userEvent.click(dismissOf(item));
      expect(await ref.dismissed).toBe('user');
      await handle.close();
    });

    it('is covered by the overlay when --ck-z-toast is lowered, which is what the test above guards', async () => {
      const toast = setup();
      toast.show({ message: 'Hidden', duration: null });
      flush();
      const handle = await openSheet();
      const [item] = toastItems();
      document.documentElement.style.setProperty('--ck-z-toast', '500');
      expect(hits(dismissOf(item))).toBe(false);
      document.documentElement.style.setProperty('--ck-z-toast', '1100');
      expect(hits(dismissOf(item))).toBe(true);
      await handle.close();
    });
  });

  describe('position', () => {
    it('stacks at the bottom edge with the newest nearest it, and honours the padding', async () => {
      await viewport(1000, 700);
      const toast = setup({ position: 'bottom' });
      toast.show({ message: 'old', duration: null });
      toast.show({ message: 'new', duration: null });
      flush();
      const [older, newer] = toastItems().map(rect);
      expect(newer.bottom).toBeCloseTo(window.innerHeight - 16, 0);
      expect(older.bottom).toBeLessThan(newer.top);
      expect(rect(toastHost()!).height).toBeGreaterThan(0);
    });

    it('stacks at the top edge with the newest nearest it', async () => {
      await viewport(1000, 700);
      const toast = setup({ position: 'top' });
      toast.show({ message: 'old', duration: null });
      toast.show({ message: 'new', duration: null });
      flush();
      const [newer, older] = toastItems().map(rect);
      expect(newer.top).toBeCloseTo(16, 0);
      expect(newer.bottom).toBeLessThan(older.top);
    });

    it('does not block the page: the empty gaps around a toast let clicks through', async () => {
      await viewport(1000, 700);
      const toast = setup();
      toast.show({ message: 'x', duration: null });
      flush();
      const button = document.createElement('button');
      button.style.cssText = 'position:fixed;left:8px;bottom:8px;width:40px;height:40px;';
      document.body.appendChild(button);
      expect(document.elementFromPoint(28, window.innerHeight - 28)).toBe(button);
    });

    it('ends at the inline end on a wide viewport, mirrored in right-to-left text', async () => {
      await viewport(1000, 700);
      const toast = setup();
      toast.show({ message: 'x', duration: null });
      flush();
      expect(rect(toastItems()[0]).right).toBeCloseTo(1000 - 16, 0);
      document.documentElement.dir = 'rtl';
      expect(rect(toastItems()[0]).left).toBeCloseTo(16, 0);
    });

    it('is centred on a wide viewport with align center', async () => {
      await viewport(1000, 700);
      const toast = setup({ align: 'center' });
      toast.show({ message: 'x', duration: null });
      flush();
      const box = rect(toastItems()[0]);
      expect(box.left + box.width / 2).toBeCloseTo(500, 0);
    });

    it('is centred and as wide as the viewport minus a space-4 gutter on a narrow one', async () => {
      await viewport(390, 800);
      const toast = setup();
      toast.show({ message: 'x', duration: null });
      flush();
      const box = rect(toastItems()[0]);
      expect(box.left).toBeCloseTo(16, 0);
      expect(box.right).toBeCloseTo(390 - 16, 0);
      expect(toastHost()!.classList.contains('ck-toast-host--center')).toBe(true);
    });

    it('follows the viewport when it changes after the host exists, and keeps a configured align', async () => {
      await viewport(1000, 700);
      const toast = setup();
      toast.show({ message: 'x', duration: null });
      flush();
      expect(toastHost()!.classList.contains('ck-toast-host--end')).toBe(true);
      await viewport(390, 800);
      await vi.waitFor(() => {
        flush();
        expect(toastHost()!.classList.contains('ck-toast-host--center')).toBe(true);
      });
      TestBed.resetTestingModule();
      resetEnvironment();
      const fixed = setup({ align: 'end' });
      fixed.show({ message: 'y', duration: null });
      flush();
      expect(toastHost()!.classList.contains('ck-toast-host--end')).toBe(true);
    });

    it('limits the width to --ck-toast-max-width', async () => {
      await viewport(1000, 700);
      const toast = setup();
      toast.show({ message: 'x', duration: null });
      flush();
      expect(rect(toastItems()[0]).width).toBe(448);
      document.documentElement.style.setProperty('--ck-toast-max-width', '20rem');
      expect(rect(toastItems()[0]).width).toBe(320);
    });
  });

  describe('sizes', () => {
    const HEIGHTS: Record<CkSize, number> = { sm: 32, md: 40, lg: 48, xl: 60 };

    it.each(CK_SIZES.map((size) => [size, HEIGHTS[size]] as const))(
      'gives the action and the dismiss button the control height of size %s: %ipx',
      (size, height) => {
        const toast = setup({ size });
        toast.show({
          message: 'x',
          duration: null,
          action: { label: 'Undo', run: () => undefined },
        });
        flush();
        const [item] = toastItems();
        expect(rect(actionOf(item)).height).toBe(height);
        expect(rect(dismissOf(item)).height).toBe(height);
        expect(rect(dismissOf(item)).width).toBe(height);
      },
    );

    it('uses the size from provideCkui when the toast config has none', () => {
      const toast = setup(undefined, provideCkui({ size: 'lg' }));
      toast.show({ message: 'x', duration: null, action: { label: 'Undo', run: () => undefined } });
      flush();
      expect(rect(actionOf(toastItems()[0])).height).toBe(48);
    });

    it('uses md without any configuration', () => {
      const toast = setup();
      toast.show({ message: 'x', duration: null, action: { label: 'Undo', run: () => undefined } });
      flush();
      expect(rect(actionOf(toastItems()[0])).height).toBe(40);
    });

    it('lets the coarse-pointer control heights through: 44px at sm', () => {
      const toast = setup({ size: 'sm' });
      setTokens({ ...LIGHT_TOKENS, '--ck-control-height-sm': '44px' });
      toast.show({ message: 'x', duration: null, action: { label: 'Undo', run: () => undefined } });
      flush();
      expect(rect(actionOf(toastItems()[0])).height).toBe(44);
      expect(rect(dismissOf(toastItems()[0])).width).toBe(44);
    });
  });

  describe('looks', () => {
    it('paints a neutral toast with the raised surface and the text colour from the tokens', () => {
      const toast = setup();
      toast.show({ message: 'x', duration: null });
      flush();
      const style = getComputedStyle(toastItems()[0]);
      expect(style.backgroundColor).toBe('rgb(255, 255, 255)');
      expect(style.color).toBe('rgb(20, 20, 30)');
      expect(style.borderTopWidth).toBe('1px');
      expect(style.borderTopLeftRadius).toBe('12px');
    });

    it('lets the component tokens restyle it', () => {
      const toast = setup();
      toast.show({ message: 'x', duration: null });
      const root = document.documentElement.style;
      root.setProperty('--ck-toast-bg', 'rgb(1, 2, 3)');
      root.setProperty('--ck-toast-fg', 'rgb(250, 251, 252)');
      root.setProperty('--ck-toast-radius', '3px');
      root.setProperty('--ck-toast-shadow', 'none');
      flush();
      const style = getComputedStyle(toastItems()[0]);
      expect(style.backgroundColor).toBe('rgb(1, 2, 3)');
      expect(style.color).toBe('rgb(250, 251, 252)');
      expect(style.borderTopLeftRadius).toBe('3px');
      expect(style.boxShadow).toBe('none');
    });

    it('lets --ck-toast-bg and -fg restyle the calm tones only, and the danger tokens the danger tone', () => {
      const toast = setup({ max: 2 });
      toast.show({ message: 'calm', duration: null });
      toast.show({ message: 'broke', tone: 'danger', duration: null });
      const root = document.documentElement.style;
      root.setProperty('--ck-toast-bg', 'rgb(1, 2, 3)');
      root.setProperty('--ck-toast-fg', 'rgb(250, 251, 252)');
      flush();
      const [calm, danger] = toastItems();
      expect(getComputedStyle(calm).backgroundColor).toBe('rgb(1, 2, 3)');
      expect(getComputedStyle(danger).backgroundColor).toBe('rgb(200, 30, 30)');
      expect(getComputedStyle(danger).color).toBe('rgb(255, 255, 255)');
      root.setProperty('--ck-toast-danger-bg', 'rgb(9, 8, 7)');
      root.setProperty('--ck-toast-danger-fg', 'rgb(240, 241, 242)');
      expect(getComputedStyle(danger).backgroundColor).toBe('rgb(9, 8, 7)');
      expect(getComputedStyle(danger).color).toBe('rgb(240, 241, 242)');
      expect(getComputedStyle(calm).backgroundColor).toBe('rgb(1, 2, 3)');
    });

    it('fills a danger toast with the danger colour and keeps its buttons readable on it', () => {
      for (const tokens of [LIGHT_TOKENS, DARK_TOKENS]) {
        TestBed.resetTestingModule();
        resetEnvironment();
        const toast = setup();
        setTokens(tokens);
        toast.show({
          message: 'Broke',
          tone: 'danger',
          action: { label: 'Retry', run: () => undefined },
        });
        flush();
        const [item] = toastItems();
        const style = getComputedStyle(item);
        expect(style.backgroundColor).toBe(tokens['--ck-color-danger']);
        expect(style.color).toBe(tokens['--ck-color-on-danger']);
        for (const control of [actionOf(item), dismissOf(item)]) {
          expect(getComputedStyle(control).color).toBe(tokens['--ck-color-on-danger']);
          expect(
            contrastRatio(getComputedStyle(control).color, style.backgroundColor),
          ).toBeGreaterThanOrEqual(4.5);
        }
        expect(getComputedStyle(actionOf(item)).borderTopColor).toBe(
          tokens['--ck-color-on-danger'],
        );
        expect(
          contrastRatio(
            getComputedStyle(item.querySelector('.ck-toast__icon')!).color,
            style.backgroundColor,
          ),
        ).toBeGreaterThanOrEqual(3);
      }
    });

    it('draws the focus ring of the buttons on a danger toast in the text colour, not the page ring', async () => {
      const toast = setup();
      toast.show({
        message: 'Broke',
        tone: 'danger',
        action: { label: 'Retry', run: () => undefined },
      });
      toast.show({ message: 'Calm', action: { label: 'Undo', run: () => undefined } });
      flush();
      const [danger, calm] = toastItems();
      const before = document.createElement('button');
      document.body.prepend(before);
      before.focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(actionOf(danger));
      expect(getComputedStyle(actionOf(danger)).outlineColor).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(actionOf(danger)).outlineWidth).toBe('2px');
      await userEvent.tab();
      await userEvent.tab();
      expect(document.activeElement).toBe(actionOf(calm));
      expect(getComputedStyle(actionOf(calm)).outlineColor).toBe('rgb(0, 0, 255)');
    });

    it('draws the tone icon of a calm toast in the tone colour, 3:1 against the card', () => {
      for (const tokens of [LIGHT_TOKENS, DARK_TOKENS]) {
        TestBed.resetTestingModule();
        resetEnvironment();
        const toast = setup({ max: 3 });
        setTokens(tokens);
        for (const tone of ['neutral', 'success', 'warning'] as const) {
          toast.show({ message: tone, tone, duration: null });
        }
        flush();
        const colours = toastItems().map(
          (item) => getComputedStyle(item.querySelector('.ck-toast__icon')!).color,
        );
        expect(new Set(colours).size).toBe(3);
        for (const colour of colours) {
          expect(contrastRatio(colour, tokens['--ck-color-surface-raised'])).toBeGreaterThanOrEqual(
            3,
          );
        }
      }
    });

    it('uses a visible border in forced-colors mode on every tone', async () => {
      const toast = setup({ max: 4 });
      for (const tone of ['neutral', 'success', 'warning', 'danger'] as const) {
        toast.show({ message: tone, tone, duration: null });
      }
      flush();
      const items = toastItems();
      expect(getComputedStyle(items[3]).borderTopColor).toBe('rgba(0, 0, 0, 0)');
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      for (const item of items) {
        const style = getComputedStyle(item);
        expect(style.borderTopWidth).toBe('1px');
        expect(style.borderTopStyle).toBe('solid');
        expect(style.borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    });

    it('slides in and out over --ck-duration-normal, and not at all with reduced motion', async () => {
      const toast = setup();
      setTokens({ ...LIGHT_TOKENS, '--ck-duration-normal': '200ms' });
      toast.show({ message: 'x', duration: null });
      flush();
      expect(getComputedStyle(toastItems()[0]).animationName).toBe('ck-toast-in');
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      expect(getComputedStyle(toastItems()[0]).animationName).toBe('none');
    });

    it('stays on screen until its leave animation ends, then goes; with reduced motion it goes at once', async () => {
      const toast = setup();
      setTokens({ ...LIGHT_TOKENS, '--ck-duration-normal': '200ms' });
      const ref = toast.show({ message: 'x', duration: null });
      flush();
      const [item] = toastItems();
      ref.dismiss();
      flush();
      expect(item.isConnected).toBe(true);
      expect(getComputedStyle(item).animationName).toBe('ck-toast-out');
      await vi.waitFor(() => {
        flush();
        expect(item.isConnected).toBe(false);
      });

      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await settle();
      const quick = toast.show({ message: 'y', duration: null });
      flush();
      const [next] = toastItems();
      quick.dismiss();
      await settle();
      expect(next.isConnected).toBe(false);
    });
  });

  describe('content that does not fit', () => {
    it('wraps a very long unbroken message and title inside the card at 390px', async () => {
      await viewport(390, 800);
      const toast = setup();
      toast.show({
        title: 'T'.repeat(300),
        message: 'm'.repeat(3000),
        duration: null,
        action: { label: 'Retry this whole thing right now please', run: () => undefined },
      });
      flush();
      const [item] = toastItems();
      const box = rect(item);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      const text = item.querySelector<HTMLElement>('.ck-toast__text')!;
      expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
      for (const control of [actionOf(item), dismissOf(item)]) {
        const controlBox = rect(control);
        expect(controlBox.left).toBeGreaterThanOrEqual(box.left);
        expect(controlBox.right).toBeLessThanOrEqual(box.right);
        expect(controlBox.width).toBeGreaterThan(0);
        expect(hits(control)).toBe(true);
      }
    });

    it('wraps a long message with spaces at the width of the card', async () => {
      await viewport(1000, 700);
      const toast = setup();
      toast.show({ message: 'word '.repeat(400), duration: null });
      flush();
      const [item] = toastItems();
      expect(rect(item).width).toBe(448);
      expect(rect(item).height).toBeGreaterThan(200);
      expect(rect(dismissOf(item)).right).toBeLessThanOrEqual(rect(item).right);
    });
  });

  describe('right-to-left', () => {
    it('lays the card out from the right: icon first, dismiss button last on the left', () => {
      document.documentElement.dir = 'rtl';
      const toast = setup();
      toast.show({
        message: 'مرحبا',
        duration: null,
        action: { label: 'تراجع', run: () => undefined },
      });
      flush();
      const [item] = toastItems();
      const icon = rect(item.querySelector('.ck-toast__icon')!);
      const action = rect(actionOf(item));
      const dismiss = rect(dismissOf(item));
      expect(icon.left).toBeGreaterThan(action.left);
      expect(action.left).toBeGreaterThan(dismiss.left);
    });
  });

  describe('accessibility', () => {
    it.each([
      ['light', LIGHT_TOKENS],
      ['dark', DARK_TOKENS],
    ])('has no axe violations in the %s theme', async (_name, tokens) => {
      const toast = setup({ max: 4 });
      setTokens(tokens);
      document.documentElement.style.colorScheme = tokens['--ck-color-scheme'];
      for (const tone of ['neutral', 'success', 'warning', 'danger'] as const) {
        toast.show({
          title: `${tone} title`,
          message: `A ${tone} message`,
          tone,
          action: { label: 'Undo', run: () => undefined },
        });
      }
      await settle();
      await expectNoAxeViolations(toastHost()!);
    });

    it('gives every dismiss button the same name and the action its label', () => {
      const toast = setup();
      toast.show({ message: 'a', duration: null, action: { label: 'Undo', run: () => undefined } });
      toast.show({ message: 'b', duration: null });
      flush();
      const [first, second] = toastItems();
      expect(dismissOf(first).getAttribute('aria-label')).toBe('Dismiss');
      expect(dismissOf(second).getAttribute('aria-label')).toBe('Dismiss');
      expect(actionOf(first).textContent!.trim()).toBe('Undo');
      expect(first.querySelectorAll('button')).toHaveLength(2);
      expect(second.querySelectorAll('button')).toHaveLength(1);
    });

    it('reaches both buttons with Tab in DOM order', async () => {
      const toast = setup();
      toast.show({ message: 'a', duration: null, action: { label: 'Undo', run: () => undefined } });
      flush();
      const [item] = toastItems();
      const before = document.createElement('button');
      document.body.prepend(before);
      before.focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(actionOf(item));
      await userEvent.tab();
      expect(document.activeElement).toBe(dismissOf(item));
    });
  });
});
