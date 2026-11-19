import { userEvent } from 'vitest/browser';
import {
  KINDS,
  activeOption,
  cleanUp,
  fakeMedia,
  listbox,
  mount,
  optionsOf,
  overlayPanels,
  popup,
  press,
  searchInput,
  settle,
  triggerOf,
  wait,
} from '../testing/select-host';

const TEMPLATE = `<ng-template #dialogTemplate>
  <h2>Workout</h2>
  <ck-select aria-label="Target" placeholder="Pick one" [filter]="filtered" [(value)]="value">${KINDS}</ck-select>
  <button type="button" class="in-dialog">Other</button>
</ng-template>`;

const dialogPanel = () => document.querySelector<HTMLElement>('.ck-dialog-panel');

describe('CkSelect in a dialog', () => {
  afterEach(async () => {
    cleanUp();
    await wait(0);
  });

  async function openDialog(sheet = false, filtered = false) {
    if (sheet) {
      fakeMedia(true);
    }
    const mounted = mount(TEMPLATE.replace('[filter]="filtered"', filtered ? 'filter' : ''));
    await settle(mounted.fixture);
    const ref = mounted.host.openDialog();
    await settle(mounted.fixture);
    await wait(20);
    const trigger = triggerOf(document.body);
    return { ...mounted, ref, trigger };
  }

  it('opens its list above a modal dialog, picks, and leaves the dialog open with focus on the trigger', async () => {
    const { fixture, host, trigger } = await openDialog();
    trigger.focus();
    trigger.click();
    await settle(fixture);
    expect(popup()).not.toBeNull();
    expect(dialogPanel()).not.toBeNull();
    const list = popup()!.getBoundingClientRect();
    expect(
      document.elementFromPoint(list.left + 5, list.top + 5)?.closest('.ck-select-popup'),
    ).toBe(popup());
    optionsOf()[1].click();
    await settle(fixture);
    expect(host.value()).toBe('watt');
    expect(popup()).toBeNull();
    expect(dialogPanel()).not.toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('works from the keyboard inside the dialog', async () => {
    const { fixture, host, trigger } = await openDialog();
    trigger.focus();
    press(trigger, 'ArrowDown');
    press(trigger, 'ArrowDown');
    press(trigger, 'Enter');
    await settle(fixture);
    expect(host.value()).toBe('watt');
    expect(dialogPanel()).not.toBeNull();
  });

  it('closes only the list on the first Escape and the dialog on the second', async () => {
    const { fixture, host, trigger } = await openDialog();
    trigger.focus();
    press(trigger, 'ArrowDown');
    await settle(fixture);
    await userEvent.keyboard('{Escape}');
    await settle(fixture);
    await wait(20);
    expect(popup()).toBeNull();
    expect(dialogPanel()).not.toBeNull();
    expect(host.value()).toBeNull();
    await userEvent.keyboard('{Escape}');
    await settle(fixture);
    await wait(20);
    expect(dialogPanel()).toBeNull();
  });

  it('closes only the list when the backdrop is pressed while it is open', async () => {
    const { fixture, trigger } = await openDialog();
    trigger.click();
    await settle(fixture);
    const backdrop = document.querySelector<HTMLElement>('.ck-overlay-backdrop')!;
    backdrop.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    backdrop.click();
    await settle(fixture);
    await wait(20);
    expect(popup()).toBeNull();
    expect(dialogPanel()).not.toBeNull();
  });

  it('keeps the dialog open while the search field of a filter has focus', async () => {
    const { fixture, host, trigger } = await openDialog(false, true);
    trigger.click();
    await settle(fixture);
    expect(document.activeElement).toBe(searchInput());
    await userEvent.keyboard('lev');
    await settle(fixture);
    expect(dialogPanel()).not.toBeNull();
    await userEvent.keyboard('{Enter}');
    await settle(fixture);
    await wait(20);
    expect(host.value()).toBe('level');
    expect(document.activeElement).toBe(trigger);
    expect(dialogPanel()).not.toBeNull();
  });

  it('closes the list together with the dialog and leaves nothing behind', async () => {
    const { fixture, ref, trigger } = await openDialog();
    trigger.click();
    await settle(fixture);
    void ref.close();
    await settle(fixture);
    await wait(50);
    expect(overlayPanels()).toEqual([]);
    expect(document.querySelector('[inert]')).toBeNull();
  });

  describe('as sheets', () => {
    it('stacks the select sheet on the dialog sheet and returns to the dialog after a pick', async () => {
      const { fixture, host, trigger } = await openDialog(true);
      trigger.focus();
      trigger.click();
      await settle(fixture);
      expect(document.querySelectorAll('.ck-overlay--sheet').length).toBe(2);
      expect(document.activeElement).toBe(listbox());
      press(listbox()!, 'ArrowDown');
      expect(activeOption()).not.toBeNull();
      optionsOf()[2].click();
      await settle(fixture);
      await wait(30);
      expect(host.value()).toBe('level');
      expect(document.querySelectorAll('.ck-overlay--sheet').length).toBe(1);
      expect(document.activeElement).toBe(trigger);
      expect(dialogPanel()!.closest('[inert]')).toBeNull();
      trigger.click();
      await settle(fixture);
      expect(popup()).not.toBeNull();
    });

    it('closes the select sheet on Escape and leaves the dialog sheet open', async () => {
      const { fixture, trigger } = await openDialog(true);
      trigger.click();
      await settle(fixture);
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      await wait(30);
      expect(document.querySelectorAll('.ck-overlay--sheet').length).toBe(1);
      expect(document.activeElement).toBe(trigger);
    });
  });
});
