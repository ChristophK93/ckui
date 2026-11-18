import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CkOverlayHost } from '@ckui/core/internal/overlay';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
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
import { CkToast } from './index';

@Component({ template: '<button type="button" id="in-dialog">Ok</button>' })
class DialogStub {}

function setup() {
  setTokens();
  configure();
  spyOnAnnouncements();
  return TestBed.inject(CkToast);
}

function opener(): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = 'opener';
  button.textContent = 'Opener';
  document.body.prepend(button);
  return button;
}

const noop = (): void => undefined;

describe('CkToast focus when a toast closes', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    resetEnvironment();
  });

  it('returns to the element focused before, after a keyboard Dismiss on a single toast', async () => {
    const toast = setup();
    const before = opener();
    toast.show({ message: 'One', duration: null });
    flush();
    before.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(dismissOf(toastItems()[0]));
    await userEvent.keyboard('{Enter}');
    flush();
    expect(document.activeElement).toBe(before);
    await settle();
    expect(document.activeElement).toBe(before);
  });

  it('falls back to the dismiss button of the next toast when it has no action', () => {
    const toast = setup();
    toast.show({ message: 'a', duration: null, action: { label: 'A', run: noop } });
    toast.show({ message: 'b', duration: null });
    toast.show({ message: 'c', duration: null });
    flush();
    const [first, second, third] = toastItems();
    actionOf(first).focus();
    dismissOf(first).click();
    flush();
    expect(document.activeElement).toBe(dismissOf(second));
    dismissOf(second).click();
    flush();
    expect(document.activeElement).toBe(dismissOf(third));
  });

  it('keeps the action slot when the next toast has an action', () => {
    const toast = setup();
    toast.show({ message: 'a', duration: null, action: { label: 'A', run: noop } });
    toast.show({ message: 'b', duration: null, action: { label: 'B', run: noop } });
    flush();
    const [first, second] = toastItems();
    actionOf(first).focus();
    actionOf(first).click();
    flush();
    expect(document.activeElement).toBe(actionOf(second));
  });

  it('goes to the previous toast when the closing one is the last', () => {
    const toast = setup();
    toast.show({ message: 'a', duration: null });
    const last = toast.show({ message: 'b', duration: null });
    flush();
    const [first, second] = toastItems();
    dismissOf(second).focus();
    last.dismiss();
    flush();
    expect(document.activeElement).toBe(dismissOf(first));
  });

  it('moves focus before the leaving toast turns inert, also for a programmatic dismiss', () => {
    const toast = setup();
    const before = opener();
    const ref = toast.show({ message: 'a', duration: null });
    flush();
    before.focus();
    const [item] = toastItems();
    dismissOf(item).focus();
    ref.dismiss();
    expect(document.activeElement).toBe(before);
    expect(item.hasAttribute('inert')).toBe(false);
    flush();
    expect(item.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(before);
  });

  it('does not move focus when it is elsewhere, or inside another toast', () => {
    const toast = setup();
    const before = opener();
    const first = toast.show({ message: 'a', duration: null });
    toast.show({ message: 'b', duration: null });
    flush();
    before.focus();
    first.dismiss();
    flush();
    expect(document.activeElement).toBe(before);
    const second = toastItems().at(-1)!;
    dismissOf(second).focus();
    toast.show({ message: 'c', duration: null });
    flush();
    expect(document.activeElement).toBe(dismissOf(second));
  });

  it('leaves focus alone when the element it came from is gone', () => {
    const toast = setup();
    const before = opener();
    const ref = toast.show({ message: 'a', duration: null });
    flush();
    before.focus();
    dismissOf(toastItems()[0]).focus();
    before.remove();
    expect(() => ref.dismiss()).not.toThrow();
    flush();
    expect(document.activeElement).not.toBe(before);
    expect(
      document.body.contains(document.activeElement) || document.activeElement === document.body,
    ).toBe(true);
  });

  it('skips an origin that is not focusable any more', () => {
    const toast = setup();
    const before = opener();
    const ref = toast.show({ message: 'a', duration: null });
    flush();
    before.focus();
    dismissOf(toastItems()[0]).focus();
    before.disabled = true;
    ref.dismiss();
    flush();
    expect(document.activeElement).not.toBe(before);
  });

  it('goes back through dismissAll to where focus came from', () => {
    const toast = setup();
    const before = opener();
    toast.show({ message: 'a', duration: null });
    toast.show({ message: 'b', duration: null });
    flush();
    before.focus();
    dismissOf(toastItems()[0]).focus();
    toast.dismissAll();
    flush();
    expect(document.activeElement).toBe(before);
  });

  describe('with a modal overlay open', () => {
    async function openSheet() {
      const handle = TestBed.inject(CkOverlayHost).open(DialogStub, {
        mode: 'sheet',
        ariaLabel: 'Dialog',
      });
      await handle.opened;
      return handle;
    }

    it('returns to the overlay element that had focus', async () => {
      const toast = setup();
      const ref = toast.show({ message: 'a', duration: null });
      flush();
      const handle = await openSheet();
      const inDialog = document.getElementById('in-dialog')!;
      inDialog.focus();
      dismissOf(toastItems()[0]).focus();
      ref.dismiss();
      flush();
      expect(document.activeElement).toBe(inDialog);
      await handle.close();
    });

    it('goes into the overlay when the element it came from became inert', async () => {
      const toast = setup();
      const before = opener();
      const ref = toast.show({ message: 'a', duration: null });
      flush();
      before.focus();
      dismissOf(toastItems()[0]).focus();
      const handle = await openSheet();
      expect(before.hasAttribute('inert')).toBe(true);
      (document.activeElement as HTMLElement).blur();
      dismissOf(toastItems()[0]).focus();
      expect(document.activeElement).toBe(dismissOf(toastItems()[0]));
      ref.dismiss();
      flush();
      expect(document.activeElement?.closest('[aria-modal="true"]')).not.toBeNull();
      await handle.close();
    });
  });
});
