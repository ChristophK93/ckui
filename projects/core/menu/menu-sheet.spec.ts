import { userEvent } from 'vitest/browser';
import {
  ROW_MENU,
  cancelButton,
  cleanUp,
  fakeMedia,
  items,
  labels,
  menu,
  mount,
  overlayPanels,
  press,
  settle,
  trigger,
  wait,
} from '../testing/menu-host';

describe('CkMenu as a sheet', () => {
  afterEach(async () => {
    cleanUp();
    await wait(0);
  });

  async function open(template = ROW_MENU()) {
    fakeMedia(true);
    const mounted = mount(template);
    await settle(mounted.fixture);
    const button = trigger(mounted.root);
    button.focus();
    button.click();
    await settle(mounted.fixture);
    return { ...mounted, trigger: button };
  }

  it('focuses the first enabled item inside the sheet and inerts the page behind it', async () => {
    const { root } = await open();
    expect(document.activeElement).toBe(items()[0]);
    expect(root.hasAttribute('inert') || root.closest('[inert]') !== null).toBe(true);
    expect(overlayPanels()).toHaveLength(1);
  });

  it('keeps the Cancel row out of the menu, out of the arrow order and in the tab order', async () => {
    await open();
    const cancel = cancelButton()!;
    expect(cancel.closest('[role="menu"]')).toBeNull();
    expect(labels()).not.toContain('Cancel');
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(items().at(-1));
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items()[0]);
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(cancel);
    expect(menu()).not.toBeNull();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(items()[0]);
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(cancel);
  });

  it('closes on the Cancel row with a click and with Enter, and returns focus to the trigger', async () => {
    const { fixture, host, trigger } = await open();
    cancelButton()!.click();
    await settle(fixture);
    await wait(20);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(host.calls).toEqual([]);

    trigger.click();
    await settle(fixture);
    cancelButton()!.focus();
    await userEvent.keyboard('{Enter}');
    await settle(fixture);
    await wait(20);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on Escape from an item and from the Cancel row', async () => {
    const { fixture, trigger } = await open();
    await userEvent.keyboard('{Escape}');
    await settle(fixture);
    await wait(20);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    await settle(fixture);
    cancelButton()!.focus();
    await userEvent.keyboard('{Escape}');
    await settle(fixture);
    await wait(20);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a press of the backdrop', async () => {
    const { fixture, trigger } = await open();
    document.querySelector<HTMLElement>('.ck-overlay-backdrop')!.click();
    await settle(fixture);
    await wait(20);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a swipe down from the grab handle', async () => {
    const { fixture, trigger } = await open();
    document.documentElement.style.setProperty('--ck-target-min', '44px');
    await settle(fixture);
    const grab = document.querySelector<HTMLElement>('[data-ck-sheet-grab]')!;
    const sheet = document.querySelector<HTMLElement>('.ck-overlay--sheet')!;
    await userEvent.dragAndDrop(grab, sheet, {
      sourcePosition: { x: 40, y: 10 },
      targetPosition: { x: 40, y: 300 },
    });
    await settle(fixture);
    await wait(50);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('presses an item with Enter, closes, and runs the handler', async () => {
    const { fixture, host, trigger } = await open();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await settle(fixture);
    await wait(20);
    expect(host.calls).toEqual(['edit']);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('does not close on a disabled item and does not run it', async () => {
    const { fixture, host } = await open();
    items()[2].click();
    await settle(fixture);
    expect(host.calls).toEqual([]);
    expect(menu()).not.toBeNull();
  });

  it('keeps Tab inside the sheet (it is a trap), unlike the popover', async () => {
    await open();
    for (let step = 0; step < 4; step++) {
      await userEvent.keyboard('{Tab}');
      expect(document.querySelector('.ck-overlay--sheet')!.contains(document.activeElement)).toBe(
        true,
      );
    }
    expect(menu()).not.toBeNull();
  });

  it('has no title and no label when the trigger has no name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture } = await open(
      `<button type="button" class="trigger" [ckMenuTrigger]="m"><svg width="10" height="10"></svg></button>
       <ng-template #m><ck-menu><button ckMenuItem>One</button></ck-menu></ng-template>`,
    );
    expect(document.querySelector('.ck-menu-panel__title')).toBeNull();
    expect(document.querySelector('.ck-overlay--sheet')!.hasAttribute('aria-label')).toBe(false);
    expect(warn).toHaveBeenCalled();
    void fixture;
  });

  it('titles the sheet with the text of an aria-labelledby reference and of a text button', async () => {
    await open(
      `<span id="name">Sweet   Spot</span><button type="button" class="trigger" aria-labelledby="name" [ckMenuTrigger]="m">…</button>
       <ng-template #m><ck-menu><button ckMenuItem>One</button></ck-menu></ng-template>`,
    );
    expect(document.querySelector('.ck-menu-panel__title')!.textContent!.trim()).toBe('Sweet Spot');
    press(document.activeElement!, 'Escape');
  });

  it('uses the cancel label from the labels token', async () => {
    fakeMedia(true);
    const { provideCkui } = await import('@ckui/core');
    const { TestBed } = await import('@angular/core/testing');
    TestBed.configureTestingModule({
      providers: [provideCkui({ labels: { cancel: 'Abbrechen' } })],
    });
    const mounted = mount(ROW_MENU());
    await settle(mounted.fixture);
    trigger(mounted.root).click();
    await settle(mounted.fixture);
    expect(cancelButton()!.textContent!.trim()).toBe('Abbrechen');
  });
});
