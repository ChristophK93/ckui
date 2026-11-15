import { TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { CkFocusTrapFactory } from './focus-trap';

describe('CkFocusTrapFactory', () => {
  let opener: HTMLButtonElement;
  let dialog: HTMLElement;
  let first: HTMLButtonElement;
  let last: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="opener" type="button">Open</button>
      <div id="dialog">
        <button id="first" type="button">First</button>
        <button id="last" type="button">Last</button>
      </div>
      <button id="outside" type="button">Outside</button>
    `;
    opener = document.querySelector<HTMLButtonElement>('#opener')!;
    dialog = document.querySelector<HTMLElement>('#dialog')!;
    first = document.querySelector<HTMLButtonElement>('#first')!;
    last = document.querySelector<HTMLButtonElement>('#last')!;
    opener.focus();
  });

  afterEach(() => document.body.replaceChildren());

  const factory = () => TestBed.inject(CkFocusTrapFactory);

  it('focuses the first tabbable element on activate', async () => {
    const trap = factory().create(dialog);
    await expect(trap.activate()).resolves.toBe(true);
    expect(document.activeElement).toBe(first);
    trap.release();
  });

  it('wraps Tab from the last element to the first', async () => {
    const trap = factory().create(dialog);
    await trap.activate();
    last.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(first);
    trap.release();
  });

  it('wraps Shift+Tab from the first element to the last', async () => {
    const trap = factory().create(dialog);
    await trap.activate();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(last);
    trap.release();
  });

  it('restores focus to the opener on release', async () => {
    const trap = factory().create(dialog);
    await trap.activate();
    trap.release();
    expect(document.activeElement).toBe(opener);
  });

  it('does not throw when released twice and restores focus only once', async () => {
    const trap = factory().create(dialog);
    await trap.activate();
    trap.release();
    document.querySelector<HTMLButtonElement>('#outside')!.focus();
    expect(() => trap.release()).not.toThrow();
    expect(document.activeElement?.id).toBe('outside');
  });

  it('does not throw and does not refocus when the previous element was removed', async () => {
    const trap = factory().create(dialog);
    await trap.activate();
    opener.remove();
    expect(() => trap.release()).not.toThrow();
    expect(document.activeElement).not.toBe(opener);
  });

  it('releases without activate without touching focus', () => {
    const trap = factory().create(dialog);
    expect(() => trap.release()).not.toThrow();
    expect(document.activeElement).toBe(opener);
  });

  it('release() before activate() resolves keeps focus on the opener and resolves false', async () => {
    const trap = factory().create(dialog);
    const activation = trap.activate();
    trap.release();
    await expect(activation).resolves.toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.activeElement).toBe(opener);
  });

  it('refuses to activate after release', async () => {
    const trap = factory().create(dialog);
    trap.release();
    await expect(trap.activate()).resolves.toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('keeps the first remembered element when activated twice', async () => {
    const trap = factory().create(dialog);
    await trap.activate();
    await trap.activate();
    trap.release();
    expect(document.activeElement).toBe(opener);
  });

  it('resolves false for a container without focusable content', async () => {
    dialog.replaceChildren();
    const trap = factory().create(dialog);
    await expect(trap.activate()).resolves.toBe(false);
    trap.release();
  });

  it('removes its anchors on release', async () => {
    const trap = factory().create(dialog);
    expect(document.querySelectorAll('.cdk-focus-trap-anchor').length).toBe(2);
    trap.release();
    expect(document.querySelectorAll('.cdk-focus-trap-anchor').length).toBe(0);
  });
});
