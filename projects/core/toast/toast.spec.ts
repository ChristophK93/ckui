import { ErrorHandler, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  actionOf,
  configure,
  LIGHT_TOKENS,
  dismissOf,
  flush,
  resetEnvironment,
  setTokens,
  setVisibility,
  settle,
  spyOnAnnouncements,
  textOf,
  toastHost,
  toastItems,
} from '../testing/toast-env';
import { CkToast, CkToastDismissReason, provideCkToast } from './index';

const FAKE = { toFake: ['setTimeout' as const, 'clearTimeout' as const, 'Date' as const] };

function setup(...providers: Parameters<typeof configure>) {
  setTokens();
  configure(...providers);
  const announce = spyOnAnnouncements();
  return { toast: TestBed.inject(CkToast), announce };
}

/** Collects the reason once the toast closes, so a test can look at it without awaiting too early. */
function track(ref: { dismissed: Promise<CkToastDismissReason> }): {
  reason?: CkToastDismissReason;
} {
  const result: { reason?: CkToastDismissReason } = {};
  void ref.dismissed.then((reason) => (result.reason = reason));
  return result;
}

const advance = async (ms: number): Promise<void> => {
  vi.advanceTimersByTime(ms);
  await Promise.resolve();
  flush();
};

const pointer = (item: HTMLElement, type: string, pointerType = 'mouse'): void => {
  item.dispatchEvent(new PointerEvent(type, { pointerType, pointerId: 1, isPrimary: true }));
};

describe('CkToast', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
    resetEnvironment();
  });

  describe('host', () => {
    it('creates nothing until the first toast is shown', () => {
      setup();
      expect(toastHost()).toBeNull();
    });

    it('is one section, labelled, exempt from inert, directly under body and outside the overlay container', () => {
      const { toast } = setup();
      const overlayContainer = document.createElement('div');
      overlayContainer.className = 'cdk-overlay-container';
      document.body.appendChild(overlayContainer);
      toast.show({ message: 'One' });
      toast.show({ message: 'Two' });
      flush();
      const hosts = document.querySelectorAll('section.ck-toast-host');
      expect(hosts).toHaveLength(1);
      const host = hosts[0] as HTMLElement;
      expect(host.parentElement).toBe(document.body);
      expect(overlayContainer.contains(host)).toBe(false);
      expect(host.getAttribute('aria-label')).toBe('Notifications');
      expect(host.hasAttribute('data-ck-inert-exempt')).toBe(true);
      expect(toastItems()).toHaveLength(2);
    });

    it('uses the labels from provideCkui', () => {
      const { toast } = setup(
        provideCkui({ labels: { notifications: 'Meldungen', dismiss: 'Schließen' } }),
      );
      toast.show({ message: 'Hallo' });
      flush();
      expect(toastHost()!.getAttribute('aria-label')).toBe('Meldungen');
      expect(dismissOf(toastItems()[0]).getAttribute('aria-label')).toBe('Schließen');
    });

    it('hides the empty host from the page and shows it again with the next toast', async () => {
      const { toast } = setup();
      const ref = toast.show({ message: 'One' });
      flush();
      ref.dismiss();
      await settle();
      expect(toastItems()).toHaveLength(0);
      expect(toastHost()!.classList.contains('ck-toast-host--empty')).toBe(true);
      expect(getComputedStyle(toastHost()!).display).toBe('none');
      toast.show({ message: 'Two' });
      flush();
      expect(toastItems()).toHaveLength(1);
      expect(getComputedStyle(toastHost()!).display).not.toBe('none');
      expect(document.querySelectorAll('section.ck-toast-host')).toHaveLength(1);
    });
  });

  describe('content', () => {
    it('shows title and message as plain text and never parses HTML', () => {
      const { toast } = setup();
      toast.show({ title: '<i>Saved</i>', message: '<img src=x onerror=alert(1)> done' });
      flush();
      const [item] = toastItems();
      expect(textOf(item)).toBe('<i>Saved</i> <img src=x onerror=alert(1)> done');
      expect(item.querySelector('img, i')).toBeNull();
    });

    it('shows a title without a message and a message without a title', () => {
      const { toast } = setup();
      toast.show({ title: 'Only title', message: '' });
      toast.show({ message: 'Only message' });
      flush();
      const items = toastItems();
      expect(textOf(items[0])).toBe('Only title');
      expect(items[0].querySelector('.ck-toast__message')).toBeNull();
      expect(textOf(items[1])).toBe('Only message');
      expect(items[1].querySelector('.ck-toast__title')).toBeNull();
    });

    it('shows nothing for a blank message without a title and resolves at once', async () => {
      const { toast, announce } = setup();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      for (const message of ['', '   ', undefined as unknown as string, 42 as unknown as string]) {
        const ref = toast.show({ message });
        expect(await ref.dismissed).toBe('programmatic');
        ref.update({ message: 'later' });
        ref.dismiss();
      }
      flush();
      expect(toastItems()).toHaveLength(0);
      expect(announce).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
    });

    it('treats a missing or unknown tone as neutral', () => {
      const { toast } = setup(provideCkToast({ max: 6 }));
      toast.show({ message: 'a' });
      toast.show({ message: 'b', tone: 'bogus' as never });
      for (const tone of ['neutral', 'success', 'warning', 'danger'] as const) {
        toast.show({ message: tone, tone });
      }
      flush();
      const tones = toastItems().map((item) =>
        Array.from(item.classList)
          .filter((name) => name.startsWith('ck-toast--'))
          .join(' '),
      );
      expect(tones).toEqual([
        'ck-toast--neutral',
        'ck-toast--neutral',
        'ck-toast--neutral',
        'ck-toast--success',
        'ck-toast--warning',
        'ck-toast--danger',
      ]);
    });

    it('draws a different icon per tone, so the tone is never colour alone', () => {
      const { toast } = setup(provideCkToast({ max: 4 }));
      for (const tone of ['neutral', 'success', 'warning', 'danger'] as const) {
        toast.show({ message: tone, tone });
      }
      flush();
      const icons = toastItems().map((item) =>
        item.querySelector('.ck-toast__icon svg path')!.getAttribute('d'),
      );
      expect(new Set(icons).size).toBe(4);
      for (const item of toastItems()) {
        expect(item.querySelector('.ck-toast__icon')!.getAttribute('aria-hidden')).toBe('true');
      }
    });

    it('ignores an action without a label or a run function', () => {
      const { toast } = setup();
      toast.show({ message: 'a', action: { label: '  ', run: () => undefined } });
      toast.show({ message: 'b', action: { label: 'Undo' } as never });
      toast.show({ message: 'c', action: null as never });
      flush();
      expect(toastItems().map((item) => item.querySelector('.ck-toast__action'))).toEqual([
        null,
        null,
        null,
      ]);
    });
  });

  describe('durations', () => {
    it('closes a plain toast after 5 seconds with the reason timeout', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const result = track(toast.show({ message: 'Saved' }));
      flush();
      await advance(4999);
      expect(result.reason).toBeUndefined();
      expect(toastItems()).toHaveLength(1);
      await advance(1);
      expect(result.reason).toBe('timeout');
      expect(toastItems()).toHaveLength(0);
    });

    it.each([
      ['an action', { action: { label: 'Undo', run: () => undefined } }],
      ['tone danger', { tone: 'danger' as const }],
      ['a duration of null', { duration: null }],
      ['a duration of 0', { duration: 0 }],
      ['a negative duration', { duration: -5 }],
      ['a duration of NaN', { duration: Number.NaN }],
      ['an infinite duration', { duration: Number.POSITIVE_INFINITY }],
    ])('stays until dismissed with %s', async (_name, extra) => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const result = track(toast.show({ message: 'Stays', ...extra }));
      flush();
      await advance(10 * 60 * 1000);
      expect(result.reason).toBeUndefined();
      expect(toastItems()).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('closes after an explicit duration even with an action or in danger', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const withAction = track(
        toast.show({
          message: 'a',
          duration: 1000,
          action: { label: 'Undo', run: () => undefined },
        }),
      );
      const danger = track(toast.show({ message: 'b', tone: 'danger', duration: 2000 }));
      const long = track(toast.show({ message: 'c', duration: 30_000 }));
      flush();
      await advance(1000);
      expect(withAction.reason).toBe('timeout');
      expect(danger.reason).toBeUndefined();
      await advance(1000);
      expect(danger.reason).toBe('timeout');
      await advance(10_000);
      expect(long.reason).toBeUndefined();
      await advance(20_000);
      expect(long.reason).toBe('timeout');
    });

    it('treats a duration beyond the timer limit as until dismissed', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const result = track(toast.show({ message: 'a', duration: 2_147_483_648 }));
      const edge = track(toast.show({ message: 'b', duration: 2_147_483_647 }));
      flush();
      await advance(60 * 60 * 1000);
      expect(result.reason).toBeUndefined();
      expect(edge.reason).toBeUndefined();
      expect(vi.getTimerCount()).toBe(1);
    });

    it('treats an undefined duration as no duration', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const result = track(toast.show({ message: 'a', duration: undefined }));
      flush();
      await advance(5000);
      expect(result.reason).toBe('timeout');
    });
  });

  describe('pausing', () => {
    it('pauses on hover and resumes with the remaining time', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const result = track(toast.show({ message: 'Saved' }));
      flush();
      const [item] = toastItems();
      await advance(2000);
      pointer(item, 'pointerenter');
      await advance(60_000);
      expect(result.reason).toBeUndefined();
      pointer(item, 'pointerleave');
      await advance(2999);
      expect(result.reason).toBeUndefined();
      await advance(1);
      expect(result.reason).toBe('timeout');
    });

    it('does not treat a touch pointer entering as a hover', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const result = track(toast.show({ message: 'Saved' }));
      flush();
      pointer(toastItems()[0], 'pointerenter', 'touch');
      await advance(5000);
      expect(result.reason).toBe('timeout');
    });

    it('pauses while focus is inside and resumes when it leaves', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const result = track(
        toast.show({
          message: 'Saved',
          duration: 5000,
          action: { label: 'Undo', run: () => undefined },
        }),
      );
      flush();
      const [item] = toastItems();
      await advance(1000);
      actionOf(item).focus();
      await advance(60_000);
      expect(result.reason).toBeUndefined();
      dismissOf(item).focus();
      await advance(60_000);
      expect(result.reason).toBeUndefined();
      dismissOf(item).blur();
      await advance(3999);
      expect(result.reason).toBeUndefined();
      await advance(1);
      expect(result.reason).toBe('timeout');
    });

    it('needs every reason released: hover and focus together', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const result = track(toast.show({ message: 'Saved' }));
      flush();
      const [item] = toastItems();
      pointer(item, 'pointerenter');
      dismissOf(item).focus();
      pointer(item, 'pointerleave');
      await advance(60_000);
      expect(result.reason).toBeUndefined();
      dismissOf(item).blur();
      await advance(5000);
      expect(result.reason).toBe('timeout');
    });

    it('pauses while the page is hidden and resumes when it is visible again', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const result = track(toast.show({ message: 'Saved' }));
      flush();
      await advance(3000);
      setVisibility('hidden');
      await advance(60_000);
      expect(result.reason).toBeUndefined();
      setVisibility('visible');
      await advance(1999);
      expect(result.reason).toBeUndefined();
      await advance(1);
      expect(result.reason).toBe('timeout');
    });

    it('starts no timer for a toast shown while the page is hidden', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      setVisibility('hidden');
      const result = track(toast.show({ message: 'Saved' }));
      flush();
      expect(vi.getTimerCount()).toBe(0);
      await advance(60_000);
      expect(result.reason).toBeUndefined();
      setVisibility('visible');
      await advance(5000);
      expect(result.reason).toBe('timeout');
    });

    it('leaves at least a second after a pause that fell at the very end', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const result = track(toast.show({ message: 'Saved' }));
      flush();
      const [item] = toastItems();
      await advance(4990);
      pointer(item, 'pointerenter');
      pointer(item, 'pointerleave');
      await advance(999);
      expect(result.reason).toBeUndefined();
      await advance(1);
      expect(result.reason).toBe('timeout');
    });
  });

  describe('replacing by id', () => {
    it('replaces the content in place without a second toast', () => {
      const { toast } = setup();
      toast.show({ id: 'bike', message: 'Bike disconnected', tone: 'warning' });
      toast.show({ message: 'Other' });
      flush();
      const before = toastItems()[0];
      toast.show({ id: 'bike', message: 'Reconnected', tone: 'success' });
      flush();
      const items = toastItems();
      expect(items).toHaveLength(2);
      expect(items[0]).toBe(before);
      expect(textOf(items[0])).toBe('Reconnected');
      expect(items[0].classList.contains('ck-toast--success')).toBe(true);
      expect(items[0].classList.contains('ck-toast--warning')).toBe(false);
    });

    it('settles the old ref as replaced, and the new ref controls the toast', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const first = toast.show({ id: 'x', message: 'First' });
      const second = toast.show({ id: 'x', message: 'Second' });
      flush();
      expect(second).not.toBe(first);
      expect(await first.dismissed).toBe('replaced');
      const result = track(second);
      first.dismiss();
      first.update({ message: 'Stale' });
      flush();
      expect(toastItems()).toHaveLength(1);
      expect(textOf(toastItems()[0])).toBe('Second');
      expect(result.reason).toBeUndefined();
      second.update({ message: 'Third' });
      flush();
      expect(textOf(toastItems()[0])).toBe('Third');
      second.dismiss();
      expect(await second.dismissed).toBe('programmatic');
    });

    it('restarts the timer', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      toast.show({ id: 'x', message: 'First' });
      flush();
      await advance(4000);
      const result = track(toast.show({ id: 'x', message: 'Second' }));
      await advance(4999);
      expect(result.reason).toBeUndefined();
      await advance(1);
      expect(result.reason).toBe('timeout');
    });

    it('takes a new tone, action and duration along', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      toast.show({ id: 'x', message: 'First' });
      const result = track(
        toast.show({
          id: 'x',
          message: 'Second',
          action: { label: 'Retry', run: () => undefined },
        }),
      );
      flush();
      expect(actionOf(toastItems()[0]).textContent!.trim()).toBe('Retry');
      await advance(60_000);
      expect(result.reason).toBeUndefined();
    });

    it('opens a new toast once the id has been dismissed', async () => {
      const { toast } = setup();
      const first = toast.show({ id: 'x', message: 'First' });
      flush();
      first.dismiss();
      const second = toast.show({ id: 'x', message: 'Second' });
      flush();
      expect(await first.dismissed).toBe('programmatic');
      second.update({ message: 'Second!' });
      flush();
      expect(textOf(toastItems()[0])).toBe('Second!');
      expect(toastItems()).toHaveLength(1);
    });

    it('replaces a toast that is still queued, in its place in the queue', () => {
      const { toast } = setup(provideCkToast({ max: 1 }));
      toast.show({ message: 'Visible' });
      toast.show({ id: 'q', message: 'Queued' });
      toast.show({ id: 'q', message: 'Queued, replaced' });
      flush();
      expect(toastItems()).toHaveLength(1);
      toast.dismissAll();
      flush();
      expect(toastItems()).toHaveLength(0);
    });

    it('keeps toasts with different ids and toasts without an id apart', () => {
      const { toast } = setup();
      toast.show({ id: 'a', message: 'A' });
      toast.show({ id: 'b', message: 'B' });
      toast.show({ message: 'same' });
      toast.show({ message: 'same' });
      flush();
      expect(toastItems()).toHaveLength(3);
    });

    it('ignores an empty id', () => {
      const { toast } = setup();
      toast.show({ id: '', message: 'A' });
      toast.show({ id: '', message: 'B' });
      flush();
      expect(toastItems()).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('changes the shown text, tone and action and restarts the timer', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const ref = toast.show({ message: 'Uploading' });
      const result = track(ref);
      flush();
      await advance(4000);
      ref.update({ message: 'Uploaded', tone: 'success', title: 'Done' });
      flush();
      const [item] = toastItems();
      expect(textOf(item)).toBe('Done Uploaded');
      expect(item.classList.contains('ck-toast--success')).toBe(true);
      await advance(4999);
      expect(result.reason).toBeUndefined();
      await advance(1);
      expect(result.reason).toBe('timeout');
    });

    it('removes the title or the action with an explicit undefined and keeps what it is not given', () => {
      const { toast } = setup();
      const ref = toast.show({
        title: 'Title',
        message: 'Body',
        action: { label: 'Undo', run: () => undefined },
      });
      flush();
      ref.update({ message: 'Body 2' });
      flush();
      expect(textOf(toastItems()[0])).toBe('Title Body 2');
      expect(actionOf(toastItems()[0])).not.toBeNull();
      ref.update({ title: undefined, action: undefined });
      flush();
      expect(textOf(toastItems()[0])).toBe('Body 2');
      expect(actionOf(toastItems()[0])).toBeNull();
    });

    it('ignores a blank message, a bad argument and an id change', () => {
      const { toast } = setup();
      const ref = toast.show({ id: 'x', message: 'Keep' });
      flush();
      ref.update({ message: '' });
      ref.update({ message: 42 as never });
      ref.update(null as never);
      ref.update(undefined as never);
      ref.update({ id: 'y' } as never);
      flush();
      expect(textOf(toastItems()[0])).toBe('Keep');
      toast.show({ id: 'x', message: 'Same toast' });
      flush();
      expect(toastItems()).toHaveLength(1);
    });

    it('does nothing once the toast is closed', async () => {
      const { toast, announce } = setup();
      const ref = toast.show({ message: 'Gone' });
      flush();
      ref.dismiss();
      await settle();
      announce.mockClear();
      ref.update({ message: 'Back?' });
      flush();
      expect(toastItems()).toHaveLength(0);
      expect(announce).not.toHaveBeenCalled();
    });
  });

  describe('dismiss reasons', () => {
    it('reports user for the dismiss button', async () => {
      const { toast } = setup();
      const ref = toast.show({ message: 'a' });
      flush();
      dismissOf(toastItems()[0]).click();
      expect(await ref.dismissed).toBe('user');
      await settle();
      expect(toastItems()).toHaveLength(0);
    });

    it('runs the action first, then reports action, and a double click runs it once', async () => {
      const { toast } = setup();
      const order: string[] = [];
      const run = vi.fn(() => order.push('run'));
      const ref = toast.show({ message: 'a', action: { label: 'Undo', run } });
      void ref.dismissed.then(() => order.push('dismissed'));
      flush();
      const button = actionOf(toastItems()[0]);
      button.click();
      button.click();
      flush();
      expect(await ref.dismissed).toBe('action');
      expect(run).toHaveBeenCalledTimes(1);
      expect(order).toEqual(['run', 'dismissed']);
    });

    it('closes the toast even when the action throws', async () => {
      const handleError = vi.fn();
      setTokens();
      TestBed.configureTestingModule({
        providers: [{ provide: ErrorHandler, useValue: { handleError } }],
        rethrowApplicationErrors: false,
      });
      spyOnAnnouncements();
      const toast = TestBed.inject(CkToast);
      const ref = toast.show({
        message: 'a',
        action: {
          label: 'Undo',
          run: () => {
            throw new Error('boom');
          },
        },
      });
      flush();
      actionOf(toastItems()[0]).click();
      expect(await ref.dismissed).toBe('action');
      await settle();
      expect(toastItems()).toHaveLength(0);
      expect(handleError).toHaveBeenCalled();
    });

    it('reports timeout, programmatic and replaced, and the first reason wins', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup();
      const timed = toast.show({ message: 'a', duration: 100 });
      const manual = toast.show({ message: 'b', duration: null });
      const replaced = toast.show({ id: 'r', message: 'c' });
      toast.show({ id: 'r', message: 'd' });
      flush();
      await advance(100);
      manual.dismiss();
      manual.dismiss();
      expect(await timed.dismissed).toBe('timeout');
      expect(await manual.dismissed).toBe('programmatic');
      expect(await replaced.dismissed).toBe('replaced');
      const late = toast.show({ message: 'e', duration: null });
      late.dismiss();
      await settle();
      timed.dismiss();
      expect(await late.dismissed).toBe('programmatic');
    });

    it('dismissAll drops queued toasts without promoting, rendering or announcing them', async () => {
      const { toast, announce } = setup(provideCkToast({ max: 1 }));
      const refs = ['a', 'b', 'c'].map((message) => toast.show({ message, duration: null }));
      flush();
      announce.mockClear();
      const added: string[] = [];
      new MutationObserver((records) => {
        for (const record of records) {
          record.addedNodes.forEach((node) => added.push(node.nodeName));
        }
      }).observe(toastHost()!, { childList: true, subtree: true });
      toast.dismissAll();
      flush();
      await Promise.resolve();
      expect(announce).not.toHaveBeenCalled();
      expect(added).not.toContain('CK-TOAST-ITEM');
      expect(toastItems()).toHaveLength(0);
      expect(await Promise.all(refs.map((ref) => ref.dismissed))).toEqual(
        Array(3).fill('programmatic'),
      );
      await settle();
      expect(toastItems()).toHaveLength(0);
    });

    it('dismissAll closes visible and queued toasts with programmatic and is safe to repeat', async () => {
      const { toast } = setup(provideCkToast({ max: 2 }));
      const refs = [1, 2, 3, 4].map((number) =>
        toast.show({ message: `t${number}`, duration: null }),
      );
      flush();
      toast.dismissAll();
      toast.dismissAll();
      expect(await Promise.all(refs.map((ref) => ref.dismissed))).toEqual(
        Array(4).fill('programmatic'),
      );
      await settle();
      expect(toastItems()).toHaveLength(0);
      toast.dismissAll();
    });

    it('takes a toast out of the tab order and the hit test while it leaves', async () => {
      const { toast } = setup();
      setTokens({ ...LIGHT_TOKENS, '--ck-duration-normal': '200ms' });
      const ref = toast.show({ message: 'a' });
      flush();
      const [item] = toastItems();
      ref.dismiss();
      flush();
      expect(item.classList.contains('ck-toast--leaving')).toBe(true);
      expect(item.hasAttribute('inert')).toBe(true);
      expect(item.isConnected).toBe(true);
      await vi.waitFor(() => {
        flush();
        expect(item.isConnected).toBe(false);
      });
    });
  });

  describe('queue', () => {
    it('shows three at once, queues the rest and shows the next when a slot frees', async () => {
      const { toast, announce } = setup();
      const refs = ['a', 'b', 'c', 'd', 'e'].map((message) =>
        toast.show({ message, duration: null }),
      );
      flush();
      expect(toastItems().map(textOf)).toEqual(['a', 'b', 'c']);
      expect(announce).toHaveBeenCalledTimes(3);
      refs[1].dismiss();
      await settle();
      expect(toastItems().map(textOf)).toEqual(['a', 'c', 'd']);
      expect(announce).toHaveBeenCalledTimes(4);
      expect(announce).toHaveBeenLastCalledWith('d', 'polite');
      refs[0].dismiss();
      refs[2].dismiss();
      await settle();
      expect(toastItems().map(textOf)).toEqual(['d', 'e']);
    });

    it('starts the timer of a queued toast when it appears, not when it was shown', async () => {
      vi.useFakeTimers(FAKE);
      const { toast } = setup(provideCkToast({ max: 1 }));
      const first = track(toast.show({ message: 'first' }));
      const second = track(toast.show({ message: 'second' }));
      flush();
      await advance(5000);
      expect(first.reason).toBe('timeout');
      expect(toastItems().map(textOf)).toEqual(['second']);
      await advance(4999);
      expect(second.reason).toBeUndefined();
      await advance(1);
      expect(second.reason).toBe('timeout');
    });

    it('lets a queued toast be dismissed before it ever shows', async () => {
      const { toast, announce } = setup(provideCkToast({ max: 1 }));
      toast.show({ message: 'first', duration: null });
      const queued = toast.show({ message: 'queued', duration: null });
      queued.dismiss();
      expect(await queued.dismissed).toBe('programmatic');
      flush();
      expect(announce).toHaveBeenCalledTimes(1);
      expect(toastItems()).toHaveLength(1);
    });

    it('does not count a leaving toast against the maximum', async () => {
      const { toast } = setup(provideCkToast({ max: 1 }));
      const first = toast.show({ message: 'first', duration: null });
      toast.show({ message: 'second', duration: null });
      flush();
      first.dismiss();
      flush();
      expect(toastItems().map(textOf)).toContain('second');
    });

    it('puts the newest nearest the edge: last in the DOM at the bottom, first at the top', () => {
      const bottom = setup(provideCkToast({ position: 'bottom' }));
      bottom.toast.show({ message: 'old', duration: null });
      bottom.toast.show({ message: 'new', duration: null });
      flush();
      expect(toastItems().map(textOf)).toEqual(['old', 'new']);
      TestBed.resetTestingModule();
      resetEnvironment();
      const top = setup(provideCkToast({ position: 'top' }));
      top.toast.show({ message: 'old', duration: null });
      top.toast.show({ message: 'new', duration: null });
      flush();
      expect(toastItems().map(textOf)).toEqual(['new', 'old']);
    });
  });

  describe('announcements', () => {
    it('announces nothing for the host or for an empty service', () => {
      const { toast, announce } = setup();
      expect(toast).toBeTruthy();
      flush();
      expect(announce).not.toHaveBeenCalled();
    });

    it('announces danger assertively and the other tones politely, as title and message', () => {
      const { toast, announce } = setup(provideCkToast({ max: 4 }));
      toast.show({ message: 'plain' });
      toast.show({ message: 'ok', tone: 'success', title: 'Saved' });
      toast.show({ message: 'careful', tone: 'warning', title: 'Heads up.' });
      toast.show({ message: 'broke', tone: 'danger', title: 'Error' });
      flush();
      expect(announce.mock.calls).toEqual([
        ['plain', 'polite'],
        ['Saved. ok', 'polite'],
        ['Heads up. careful', 'polite'],
        ['Error. broke', 'assertive'],
      ]);
    });

    it('announces a title alone', () => {
      const { toast, announce } = setup();
      toast.show({ title: 'Only title', message: '' });
      flush();
      expect(announce).toHaveBeenCalledWith('Only title', 'polite');
    });

    it('announces again when update changes the text and not when it repeats it', () => {
      const { toast, announce } = setup();
      const ref = toast.show({ message: 'Uploading' });
      flush();
      expect(announce).toHaveBeenCalledTimes(1);
      ref.update({ message: 'Uploading' });
      ref.update({ duration: 9000 });
      expect(announce).toHaveBeenCalledTimes(1);
      ref.update({ message: 'Uploaded' });
      expect(announce).toHaveBeenCalledTimes(2);
      expect(announce).toHaveBeenLastCalledWith('Uploaded', 'polite');
      ref.update({ title: 'Done' });
      expect(announce).toHaveBeenLastCalledWith('Done. Uploaded', 'polite');
    });

    it('announces a replacement that says something new, and stays quiet for identical text', () => {
      const { toast, announce } = setup();
      toast.show({ id: 'x', message: 'Disconnected' });
      flush();
      toast.show({ id: 'x', message: 'Disconnected' });
      expect(announce).toHaveBeenCalledTimes(1);
      toast.show({ id: 'x', message: 'Reconnected' });
      expect(announce).toHaveBeenCalledTimes(2);
      expect(announce).toHaveBeenLastCalledWith('Reconnected', 'polite');
    });

    it('announces identical text again when the replacement is more urgent', () => {
      const { toast, announce } = setup();
      toast.show({ id: 'x', message: 'Disconnected' });
      toast.show({ id: 'x', message: 'Disconnected', tone: 'danger' });
      expect(announce).toHaveBeenCalledTimes(2);
      expect(announce).toHaveBeenLastCalledWith('Disconnected', 'assertive');
    });

    it('announces a queued toast only once it appears, with its latest text', async () => {
      const { toast, announce } = setup(provideCkToast({ max: 1 }));
      const first = toast.show({ message: 'first', duration: null });
      const queued = toast.show({ message: 'queued', duration: null });
      queued.update({ message: 'queued, updated' });
      flush();
      expect(announce.mock.calls).toEqual([['first', 'polite']]);
      first.dismiss();
      expect(announce.mock.calls).toEqual([
        ['first', 'polite'],
        ['queued, updated', 'polite'],
      ]);
    });
  });

  describe('what a screen reader hears', () => {
    const liveRegion = (): HTMLElement | null =>
      document.querySelector<HTMLElement>('.cdk-live-announcer-element');

    function setupReal(...providers: Parameters<typeof configure>) {
      setTokens();
      configure(...providers);
      return TestBed.inject(CkToast);
    }

    it('hears all three texts of three toasts shown in one tick', async () => {
      const toast = setupReal();
      toast.show({ message: 'First' });
      toast.show({ message: 'Second' });
      toast.show({ message: 'Third' });
      flush();
      await vi.waitFor(() => expect(liveRegion()?.textContent).toBe('First. Second. Third'));
      expect(liveRegion()!.getAttribute('aria-live')).toBe('polite');
    });

    it('is assertive and hears both texts for danger and neutral in one tick, either order', async () => {
      const toast = setupReal();
      toast.show({ message: 'Calm' });
      toast.show({ tone: 'danger', title: 'Broke', message: 'Try again' });
      flush();
      await vi.waitFor(() => expect(liveRegion()?.textContent).toBe('Calm. Broke. Try again'));
      expect(liveRegion()!.getAttribute('aria-live')).toBe('assertive');
    });

    it('hears two toasts shown 20 ms apart together, and only the second after 500 ms', async () => {
      const toast = setupReal();
      toast.show({ message: 'Bike disconnected', tone: 'warning' });
      flush();
      await new Promise((done) => setTimeout(done, 20));
      toast.show({ message: 'Control error', tone: 'danger' });
      flush();
      await vi.waitFor(() =>
        expect(liveRegion()?.textContent).toBe('Bike disconnected. Control error'),
      );
      expect(liveRegion()!.getAttribute('aria-live')).toBe('assertive');
      await new Promise((done) => setTimeout(done, 500));
      toast.show({ message: 'Reconnected' });
      flush();
      await vi.waitFor(() => expect(liveRegion()?.textContent).toBe('Reconnected'));
      expect(liveRegion()!.getAttribute('aria-live')).toBe('polite');
    });

    it('hears a later toast on its own and an update again', async () => {
      const toast = setupReal();
      const ref = toast.show({ message: 'Uploading' });
      flush();
      await vi.waitFor(() => expect(liveRegion()?.textContent).toBe('Uploading'));
      ref.update({ message: 'Uploaded' });
      await vi.waitFor(() => expect(liveRegion()?.textContent).toBe('Uploaded'));
    });

    it('hears a queued toast when a slot frees, without the ones that are already visible', async () => {
      const toast = setupReal(provideCkToast({ max: 1 }));
      const first = toast.show({ message: 'First', duration: null });
      toast.show({ message: 'Second', duration: null });
      await vi.waitFor(() => expect(liveRegion()?.textContent).toBe('First'));
      first.dismiss();
      await vi.waitFor(() => expect(liveRegion()?.textContent).toBe('Second'));
    });
  });

  describe('on the server', () => {
    it('shows nothing, announces nothing and resolves every ref as programmatic', async () => {
      const { toast, announce } = setup({ provide: PLATFORM_ID, useValue: 'server' });
      const ref = toast.show({
        message: 'Hi',
        tone: 'danger',
        action: { label: 'x', run: () => undefined },
      });
      ref.update({ message: 'Hello' });
      ref.dismiss();
      toast.dismissAll();
      expect(await ref.dismissed).toBe('programmatic');
      expect(toastHost()).toBeNull();
      expect(document.querySelector('ck-toast-item')).toBeNull();
      expect(announce).not.toHaveBeenCalled();
    });
  });

  describe('teardown', () => {
    it('removes the host, settles every promise, stops every timer and the visibility listener', async () => {
      vi.useFakeTimers(FAKE);
      const { toast, announce } = setup(provideCkToast({ max: 2 }));
      const removeListener = vi.spyOn(document, 'removeEventListener');
      const refs = [
        toast.show({ message: 'timed' }),
        toast.show({ message: 'sticky', duration: null }),
        toast.show({ message: 'queued' }),
        toast.show({ message: 'leaving' }),
      ];
      flush();
      refs[1].dismiss();
      flush();
      expect(vi.getTimerCount()).toBeGreaterThan(0);
      const reasons = refs.map((ref) => track(ref));
      announce.mockClear();
      TestBed.resetTestingModule();
      await Promise.resolve();
      expect(reasons.map((result) => result.reason)).toEqual([
        'programmatic',
        'programmatic',
        'programmatic',
        'programmatic',
      ]);
      expect(toastHost()).toBeNull();
      expect(document.querySelector('ck-toast-item')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
      expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      vi.advanceTimersByTime(60_000);
      setVisibility('hidden');
      setVisibility('visible');
      expect(announce).not.toHaveBeenCalled();
    });

    it('shows nothing after the app is destroyed', async () => {
      const { toast } = setup();
      TestBed.resetTestingModule();
      const ref = toast.show({ message: 'late' });
      expect(await ref.dismissed).toBe('programmatic');
      expect(toastHost()).toBeNull();
    });
  });
});

describe('provideCkToast', () => {
  it.each([
    [{ position: 'left' }],
    [{ align: 'start' }],
    [{ max: 0 }],
    [{ max: -1 }],
    [{ max: 1.5 }],
    [{ max: Number.NaN }],
    [{ max: '3' }],
    [{ size: 'huge' }],
  ])('rejects %j', (config) => {
    expect(() => provideCkToast(config as never)).toThrow(TypeError);
  });

  it('accepts the documented values and no argument at all', () => {
    expect(() => provideCkToast()).not.toThrow();
    expect(() =>
      provideCkToast({ position: 'top', align: 'center', max: 5, size: 'xl' }),
    ).not.toThrow();
  });
});
