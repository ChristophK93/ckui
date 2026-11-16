import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  actionOf,
  configure,
  dismissOf,
  flush,
  resetEnvironment,
  setTokens,
  settle,
  spyOnAnnouncements,
  toastItems,
} from '../testing/toast-env';
import { CkToast, CkToastDismissReason } from './index';

let clock = 0;

function setup() {
  setTokens();
  configure();
  spyOnAnnouncements();
  return TestBed.inject(CkToast);
}

function track(ref: { dismissed: Promise<CkToastDismissReason> }): {
  reason?: CkToastDismissReason;
} {
  const result: { reason?: CkToastDismissReason } = {};
  void ref.dismissed.then((reason) => (result.reason = reason));
  return result;
}

interface PointerOptions {
  pointerId?: number;
  isPrimary?: boolean;
  button?: number;
}

function fire(
  target: EventTarget,
  type: string,
  x: number,
  y: number,
  options: PointerOptions = {},
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: options.pointerId ?? 1,
      isPrimary: options.isPrimary ?? true,
      button: options.button ?? 0,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
    }),
  );
}

/** Starts a drag at the middle of the element; `step` moves the pointer, taking `elapsed` ms. */
function startDrag(target: HTMLElement, options?: PointerOptions) {
  const rect = target.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;
  fire(target, 'pointerdown', startX, startY, options);
  return {
    move(deltaX: number, deltaY = 0, elapsed = 400, moveOptions?: PointerOptions): void {
      clock += elapsed;
      fire(document, 'pointermove', startX + deltaX, startY + deltaY, moveOptions ?? options);
    },
    up(deltaX: number, deltaY = 0, elapsed = 0): void {
      clock += elapsed;
      fire(document, 'pointerup', startX + deltaX, startY + deltaY, options);
    },
    cancel(): void {
      fire(document, 'pointercancel', startX, startY, options);
    },
  };
}

const widthOf = (item: HTMLElement): number => item.getBoundingClientRect().width;

describe('CkToast swipe', () => {
  beforeEach(() => {
    clock = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
    resetEnvironment();
  });

  it('dismisses with the reason user after a slow drag past a third of the width', async () => {
    const toast = setup();
    const ref = toast.show({ message: 'Swipe me', duration: null });
    flush();
    const [item] = toastItems();
    const far = widthOf(item) * 0.4;
    const drag = startDrag(item);
    drag.move(far / 2);
    drag.move(far);
    expect(parseFloat(item.style.translate)).toBeCloseTo(far);
    expect(Number(item.style.opacity)).toBeLessThan(1);
    expect(item.classList.contains('ck-toast--dragging')).toBe(true);
    drag.up(far);
    expect(await ref.dismissed).toBe('user');
    flush();
    expect(item.classList.contains('ck-toast--dragging')).toBe(false);
    await settle();
    expect(toastItems()).toHaveLength(0);
  });

  it('dismisses sideways in either direction, also in right-to-left text', async () => {
    document.documentElement.dir = 'rtl';
    const toast = setup();
    const left = toast.show({ message: 'left', duration: null });
    const right = toast.show({ message: 'right', duration: null });
    flush();
    const [first, second] = toastItems();
    const far = widthOf(first) * 0.5;
    const dragLeft = startDrag(first);
    dragLeft.move(-far);
    dragLeft.up(-far);
    const dragRight = startDrag(second);
    dragRight.move(far);
    dragRight.up(far);
    expect(await left.dismissed).toBe('user');
    expect(await right.dismissed).toBe('user');
  });

  it('snaps back and stays when the drag is short and slow', () => {
    const toast = setup();
    const result = track(toast.show({ message: 'Stay', duration: null }));
    flush();
    const [item] = toastItems();
    const near = widthOf(item) * 0.2;
    const drag = startDrag(item);
    drag.move(near);
    expect(item.style.translate).not.toBe('');
    drag.up(near, 0, 500);
    flush();
    expect(item.style.translate).toBe('');
    expect(item.style.opacity).toBe('');
    expect(item.classList.contains('ck-toast--dragging')).toBe(false);
    expect(result.reason).toBeUndefined();
    expect(toastItems()).toHaveLength(1);
  });

  it('dismisses on a fast flick that moved a little, and not on a fast twitch', async () => {
    const toast = setup();
    const flick = toast.show({ message: 'flick', duration: null });
    const twitch = track(toast.show({ message: 'twitch', duration: null }));
    flush();
    const [first, second] = toastItems();
    const flickDrag = startDrag(first);
    flickDrag.move(40, 0, 20);
    flickDrag.up(40, 0, 10);
    expect(await flick.dismissed).toBe('user');
    const twitchDrag = startDrag(second);
    twitchDrag.move(12, 0, 20);
    twitchDrag.up(12, 0, 10);
    flush();
    expect(twitch.reason).toBeUndefined();
  });

  it('snaps back on pointercancel', () => {
    const toast = setup();
    const result = track(toast.show({ message: 'Cancel', duration: null }));
    flush();
    const [item] = toastItems();
    const drag = startDrag(item);
    drag.move(widthOf(item) * 0.6);
    expect(item.style.translate).not.toBe('');
    drag.cancel();
    expect(item.style.translate).toBe('');
    expect(item.classList.contains('ck-toast--dragging')).toBe(false);
    drag.up(widthOf(item) * 0.6);
    expect(result.reason).toBeUndefined();
  });

  it('ignores a mostly vertical drag, so the page can scroll', () => {
    const toast = setup();
    const run = vi.fn();
    const result = track(
      toast.show({ message: 'Scroll', duration: null, action: { label: 'Go', run } }),
    );
    flush();
    const [item] = toastItems();
    const drag = startDrag(item);
    drag.move(3, 40);
    drag.move(300, 60);
    expect(item.style.translate).toBe('');
    expect(item.classList.contains('ck-toast--dragging')).toBe(false);
    drag.up(300, 60);
    expect(result.reason).toBeUndefined();
    actionOf(item).click();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('treats a movement under the slop as a tap, so the buttons still click', async () => {
    const toast = setup();
    const ref = toast.show({ message: 'Tap', duration: null });
    flush();
    const [item] = toastItems();
    const drag = startDrag(dismissOf(item));
    drag.move(5, 2, 10);
    drag.up(5, 2, 10);
    expect(item.style.translate).toBe('');
    dismissOf(item).click();
    expect(await ref.dismissed).toBe('user');
  });

  it('swallows the click that ends a drag, even over a button, but not the next click', () => {
    const toast = setup();
    const run = vi.fn();
    toast.show({ message: 'Drag', duration: null, action: { label: 'Undo', run } });
    flush();
    const [item] = toastItems();
    const button = actionOf(item);
    const drag = startDrag(button);
    drag.move(widthOf(item) * 0.15);
    drag.up(widthOf(item) * 0.15, 0, 400);
    button.click();
    expect(run).not.toHaveBeenCalled();
    flush();
    fire(button, 'pointerdown', 0, 0);
    fire(document, 'pointerup', 0, 0);
    button.click();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not swallow a later click, such as a keyboard activation, after a snapped-back drag', async () => {
    const toast = setup();
    const run = vi.fn();
    toast.show({ message: 'Drag', duration: null, action: { label: 'Undo', run } });
    flush();
    const [item] = toastItems();
    const drag = startDrag(actionOf(item));
    drag.move(widthOf(item) * 0.1);
    drag.up(widthOf(item) * 0.1, 0, 500);
    flush();
    await new Promise((done) => setTimeout(done, 200));
    actionOf(item).click();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not swallow the click of a press that never became a drag', () => {
    const toast = setup();
    const run = vi.fn();
    toast.show({ message: 'Tap', duration: null, action: { label: 'Undo', run } });
    flush();
    const [item] = toastItems();
    const drag = startDrag(actionOf(item));
    drag.up(0);
    actionOf(item).click();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('ignores a secondary button, a non-primary pointer and moves of another pointer', () => {
    const toast = setup();
    toast.show({ message: 'Ignore', duration: null });
    flush();
    const [item] = toastItems();
    const far = widthOf(item) * 0.6;
    const rightButton = startDrag(item, { button: 2 });
    rightButton.move(far);
    expect(item.style.translate).toBe('');
    const secondFinger = startDrag(item, { isPrimary: false });
    secondFinger.move(far);
    expect(item.style.translate).toBe('');
    const drag = startDrag(item);
    drag.move(far, 0, 400, { pointerId: 7 });
    expect(item.style.translate).toBe('');
    drag.cancel();
  });

  it('holds the timer while dragging and lets it run again after a snap back', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const toast = setup();
    const result = track(toast.show({ message: 'Timed' }));
    flush();
    const [item] = toastItems();
    vi.advanceTimersByTime(2000);
    const drag = startDrag(item);
    drag.move(widthOf(item) * 0.1);
    vi.advanceTimersByTime(60_000);
    expect(result.reason).toBeUndefined();
    drag.up(widthOf(item) * 0.1, 0, 500);
    vi.advanceTimersByTime(2999);
    expect(result.reason).toBeUndefined();
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(result.reason).toBe('timeout');
  });

  it('stops listening to the document when the app is destroyed in the middle of a drag', () => {
    const toast = setup();
    toast.show({ message: 'Mid drag', duration: null });
    flush();
    const [item] = toastItems();
    const remove = vi.spyOn(document, 'removeEventListener');
    startDrag(item).move(widthOf(item) * 0.1);
    TestBed.resetTestingModule();
    const removed = remove.mock.calls.map(([type]) => type);
    expect(removed).toEqual(expect.arrayContaining(['pointermove', 'pointerup', 'pointercancel']));
  });

  it('does not start a drag on a toast that is already leaving', async () => {
    const toast = setup();
    const ref = toast.show({ message: 'Leaving', duration: null });
    flush();
    const [item] = toastItems();
    ref.dismiss();
    startDrag(item).move(widthOf(item) * 0.6);
    expect(item.style.translate).toBe('');
    expect(await ref.dismissed).toBe('programmatic');
  });
});
