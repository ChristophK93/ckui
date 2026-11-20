import { cdp } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setVisibility } from '../testing/toast-env';
import { cleanUp, mount, pointer, press, settle, shown, wait } from '../testing/tooltip-host';

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

const BUTTON = (attributes = '') =>
  `<button ckButton aria-label="Rest timer" ckTooltip="Starts after each set" ${attributes} (click)="log('click')">Rest</button>`;

const button = (root: HTMLElement): HTMLButtonElement => root.querySelector('button')!;

const touch = (
  element: Element,
  type: Parameters<typeof pointer>[1],
  init: PointerEventInit = {},
) => pointer(element, type, { pointerType: 'touch', ...init });

function fakeTimers(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

describe('CkTooltip on touch', () => {
  afterEach(() => {
    cleanUp();
  });

  describe('long-press', () => {
    it('shows after 500 ms of pressing, not before', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(499);
      expect(shown()).toHaveLength(0);
      vi.advanceTimersByTime(1);
      expect(shown()).toHaveLength(1);
    });

    it('stays after the finger lifts, hides 1.5 s later', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(700);
      touch(button(root), 'pointerup');
      touch(button(root), 'lostpointercapture');
      vi.advanceTimersByTime(1499);
      expect(shown()).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(shown()).toHaveLength(0);
    });

    it('turns off the native callout and text selection only while the finger is down, and gives back the consumer style', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON('style="user-select: text"'));
      await settle(fixture);
      const host = button(root);
      expect(host.style.getPropertyValue('user-select')).toBe('text');
      touch(host, 'pointerdown');
      expect(host.style.getPropertyValue('user-select')).toBe('none');
      // -webkit-touch-callout exists in Safari only; Chromium drops the declaration.
      touch(host, 'pointerup');
      expect(host.style.getPropertyValue('user-select')).toBe('text');
      expect(host.getAttribute('style')).toBe('user-select: text;');
    });

    it('keeps the long-press context menu of the browser away, and a normal right-click alone', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      const host = button(root);
      expect(host.dispatchEvent(new MouseEvent('contextmenu', { cancelable: true }))).toBe(true);
      touch(host, 'pointerdown');
      expect(host.dispatchEvent(new MouseEvent('contextmenu', { cancelable: true }))).toBe(false);
      touch(host, 'pointerup');
      vi.advanceTimersByTime(1000);
      expect(host.dispatchEvent(new MouseEvent('contextmenu', { cancelable: true }))).toBe(true);
    });

    it('suppresses the click that follows the long-press, once, and not the next one', async () => {
      fakeTimers();
      const { fixture, root, host } = mount(BUTTON());
      await settle(fixture);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(600);
      touch(button(root), 'pointerup');
      button(root).click();
      expect(host.calls).toEqual([]);
      button(root).click();
      expect(host.calls).toEqual(['click']);
    });

    it('lets a keyboard click through right after a long-press', async () => {
      fakeTimers();
      const { fixture, root, host } = mount(BUTTON());
      await settle(fixture);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(600);
      touch(button(root), 'pointerup');
      press(button(root), 'Enter');
      button(root).click();
      expect(host.calls).toEqual(['click']);
    });

    it('stops suppressing 400 ms after the release when no click came', async () => {
      fakeTimers();
      const { fixture, root, host } = mount(BUTTON());
      await settle(fixture);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(600);
      touch(button(root), 'pointerup');
      vi.advanceTimersByTime(399);
      vi.advanceTimersByTime(1);
      button(root).click();
      expect(host.calls).toEqual(['click']);
    });

    it('does not let a new press inherit the suppression of the last one', async () => {
      fakeTimers();
      const { fixture, root, host } = mount(BUTTON());
      await settle(fixture);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(600);
      touch(button(root), 'pointerup');
      touch(button(root), 'pointerdown');
      touch(button(root), 'pointerup');
      button(root).click();
      expect(host.calls).toEqual(['click']);
    });

    it('does nothing for a plain tap: no bubble, the click goes through, nothing left behind', async () => {
      fakeTimers();
      const { fixture, root, host } = mount(BUTTON());
      await settle(fixture);
      const target = button(root);
      touch(target, 'pointerdown');
      vi.advanceTimersByTime(150);
      touch(target, 'pointerup');
      target.click();
      vi.advanceTimersByTime(5000);
      expect(shown()).toHaveLength(0);
      expect(host.calls).toEqual(['click']);
      expect(target.hasAttribute('style')).toBe(false);
    });

    it('is cancelled by a finger that moves 10 px, and survives one that moves 9 px', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      const target = button(root);
      const box = target.getBoundingClientRect();
      touch(target, 'pointerdown', { clientX: box.left + 5, clientY: box.top + 5 });
      vi.advanceTimersByTime(200);
      touch(target, 'pointermove', { clientX: box.left + 5 + 9, clientY: box.top + 5 });
      vi.advanceTimersByTime(300);
      expect(shown()).toHaveLength(1);
      touch(target, 'pointerup');
      vi.advanceTimersByTime(2000);
      touch(target, 'pointerdown', { clientX: box.left + 5, clientY: box.top + 5 });
      vi.advanceTimersByTime(200);
      touch(target, 'pointermove', { clientX: box.left + 5 + 6, clientY: box.top + 5 + 8 });
      vi.advanceTimersByTime(1000);
      expect(shown()).toHaveLength(0);
      expect(target.hasAttribute('style')).toBe(false);
      target.click();
    });

    it('ignores the move of another finger and a second finger pressing', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      const target = button(root);
      touch(target, 'pointerdown');
      vi.advanceTimersByTime(200);
      touch(target, 'pointermove', { pointerId: 2, clientX: 5000, clientY: 5000 });
      vi.advanceTimersByTime(300);
      expect(shown()).toHaveLength(1);
      touch(target, 'pointerup');
      vi.advanceTimersByTime(2000);
      touch(target, 'pointerdown', { isPrimary: false, pointerId: 3 });
      vi.advanceTimersByTime(1000);
      expect(shown()).toHaveLength(0);
    });

    it.each(['pointercancel', 'lostpointercapture', 'pointerup'] as const)(
      'ends the press on %s before 500 ms and shows nothing',
      async (type) => {
        fakeTimers();
        const { fixture, root } = mount(BUTTON());
        await settle(fixture);
        touch(button(root), 'pointerdown');
        vi.advanceTimersByTime(300);
        touch(button(root), type);
        vi.advanceTimersByTime(2000);
        expect(shown()).toHaveLength(0);
        expect(button(root).hasAttribute('style')).toBe(false);
      },
    );

    it('ends the press when the host loses focus, and when the document turns hidden', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(300);
      button(root).focus();
      button(root).blur();
      vi.advanceTimersByTime(2000);
      expect(shown()).toHaveLength(0);
      expect(button(root).hasAttribute('style')).toBe(false);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(300);
      setVisibility('hidden');
      vi.advanceTimersByTime(2000);
      expect(shown()).toHaveLength(0);
      expect(button(root).hasAttribute('style')).toBe(false);
      setVisibility('visible');
    });

    it('hides a long-press tooltip on the next press anywhere, even before the finger lifted', async () => {
      fakeTimers();
      const { fixture, root } = mount(`${BUTTON()}<p id="elsewhere">Elsewhere</p>`);
      await settle(fixture);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(600);
      touch(button(root), 'pointerup');
      expect(shown()).toHaveLength(1);
      touch(root.querySelector('#elsewhere')!, 'pointerdown');
      expect(shown()).toHaveLength(0);
    });

    it('starts over on a second press on the same host', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(600);
      touch(button(root), 'pointerup');
      expect(shown()).toHaveLength(1);
      touch(button(root), 'pointerdown');
      expect(shown()).toHaveLength(0);
      vi.advanceTimersByTime(499);
      expect(shown()).toHaveLength(0);
      vi.advanceTimersByTime(1);
      expect(shown()).toHaveLength(1);
    });

    it('does not time the 1.5 s hide from the press, only from the release', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      touch(button(root), 'pointerdown');
      vi.advanceTimersByTime(4000);
      expect(shown()).toHaveLength(1);
      touch(button(root), 'pointerup');
      vi.advanceTimersByTime(1499);
      expect(shown()).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(shown()).toHaveLength(0);
    });

    it('leaves a disabled button, a disabled tooltip and a blank text alone', async () => {
      fakeTimers();
      for (const markup of [
        `<button ckButton disabled aria-label="Rest timer" ckTooltip="Hi">Rest</button>`,
        `<button ckButton aria-label="Rest timer" ckTooltip="Hi" [ckTooltipDisabled]="true">Rest</button>`,
        `<button ckButton aria-label="Rest timer" ckTooltip="  ">Rest</button>`,
      ]) {
        const { fixture, root } = mount(markup);
        await settle(fixture);
        touch(button(root), 'pointerdown');
        vi.advanceTimersByTime(2000);
        expect(shown(), markup).toHaveLength(0);
        expect(button(root).hasAttribute('style')).toBe(false);
        touch(button(root), 'pointerup');
        fixture.destroy();
        cleanUp();
      }
    });

    it('cleans up when the host is destroyed in the middle of a press', async () => {
      fakeTimers();
      const { fixture, root } = mount(BUTTON());
      await settle(fixture);
      const target = button(root);
      touch(target, 'pointerdown');
      vi.advanceTimersByTime(600);
      fixture.destroy();
      const show = vi.spyOn(HTMLElement.prototype, 'showPopover');
      touch(target, 'pointerup');
      vi.advanceTimersByTime(10_000);
      expect(show).not.toHaveBeenCalled();
      expect(shown()).toHaveLength(0);
      expect(target.hasAttribute('style')).toBe(false);
    });
  });

  describe('with a real touch screen', () => {
    async function touchEmulation(enabled: boolean): Promise<void> {
      await (cdp() as unknown as Session).send('Emulation.setTouchEmulationEnabled', {
        enabled,
        maxTouchPoints: 1,
      });
    }

    async function touchAt(
      type: 'touchStart' | 'touchEnd',
      point: { x: number; y: number },
    ): Promise<void> {
      await (cdp() as unknown as Session).send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x: point.x, y: point.y }],
      });
    }

    const centre = (element: Element) => {
      const box = element.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    };

    afterEach(async () => {
      await touchEmulation(false);
    });

    it('shows after a held touch, and the click of the release never reaches the button', async () => {
      await touchEmulation(true);
      const { fixture, root, host } = mount(BUTTON(), undefined, undefined);
      root.style.padding = '120px';
      await settle(fixture);
      const point = centre(button(root));
      await touchAt('touchStart', point);
      await wait(650);
      expect(shown()).toHaveLength(1);
      await touchAt('touchEnd', point);
      await wait(100);
      expect(host.calls).toEqual([]);
      await wait(1600);
      expect(shown()).toHaveLength(0);
    });

    it('does nothing for a quick tap, and the click arrives once', async () => {
      await touchEmulation(true);
      const { fixture, root, host } = mount(BUTTON());
      root.style.padding = '120px';
      await settle(fixture);
      const point = centre(button(root));
      await touchAt('touchStart', point);
      await wait(60);
      await touchAt('touchEnd', point);
      await wait(700);
      expect(shown()).toHaveLength(0);
      expect(host.calls).toEqual(['click']);
    });
  });
});
