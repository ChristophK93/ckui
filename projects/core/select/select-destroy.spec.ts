import { vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
  KINDS,
  cleanUp,
  fakeMedia,
  listbox,
  mount,
  optionsOf,
  overlayPanels,
  searchInput,
  settle,
  triggerOf,
  wait,
} from '../testing/select-host';

const PLAIN = `<ck-select aria-label="Target" [filter]="filtered" [(value)]="value">${KINDS}</ck-select>`;

const DIALOG = `<ng-template #dialogTemplate>
  <h2>Workout</h2>
  <ck-select aria-label="Target" [filter]="filtered" [(value)]="value">${KINDS}</ck-select>
</ng-template>`;

describe('CkSelect teardown', () => {
  let errors: unknown[][];

  beforeEach(() => {
    errors = [];
    const record = (...args: unknown[]) => void errors.push(args);
    vi.spyOn(console, 'error').mockImplementation(record);
    vi.spyOn(console, 'warn').mockImplementation(record);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanUp();
  });

  /** Angular reports an emit on a destroyed output as NG0953. */
  const reported = (): string[] =>
    errors.map((args) => args.map(String).join(' ')).filter((text) => text.includes('NG0953'));

  async function teardown(): Promise<void> {
    cleanUp();
    await wait(50);
  }

  async function mountSelect(template: string, filtered: boolean, sheet = false) {
    if (sheet) {
      fakeMedia(true);
    }
    const mounted = mount(template.replace('[filter]="filtered"', filtered ? 'filter' : ''));
    await settle(mounted.fixture);
    return mounted;
  }

  it('emits nothing after a pick in a stacked sheet once the host is destroyed', async () => {
    const { fixture, host } = await mountSelect(DIALOG, false, true);
    host.openDialog();
    await settle(fixture);
    await wait(20);
    const trigger = triggerOf(document.body);
    trigger.focus();
    trigger.click();
    await settle(fixture);
    optionsOf()[2].click();
    await settle(fixture);
    await wait(30);
    expect(host.value()).toBe('level');
    expect(document.activeElement).toBe(trigger);
    await teardown();
    expect(reported()).toEqual([]);
  });

  it('emits nothing when a select that holds focus is destroyed', async () => {
    const { fixture, root } = await mountSelect(PLAIN, false);
    const trigger = triggerOf(root);
    trigger.focus();
    await settle(fixture);
    expect(document.activeElement).toBe(trigger);
    await teardown();
    expect(reported()).toEqual([]);
  });

  it('emits nothing when a select is destroyed while its popover is open', async () => {
    const { fixture, root } = await mountSelect(PLAIN, true);
    triggerOf(root).focus();
    triggerOf(root).click();
    await settle(fixture);
    expect(document.activeElement).toBe(searchInput());
    await userEvent.keyboard('le');
    await teardown();
    expect(reported()).toEqual([]);
    expect(overlayPanels()).toEqual([]);
  });

  it('emits nothing when a select is destroyed while its sheet is open', async () => {
    const { fixture, root } = await mountSelect(PLAIN, false, true);
    triggerOf(root).focus();
    triggerOf(root).click();
    await settle(fixture);
    expect(document.activeElement).toBe(listbox());
    await teardown();
    expect(reported()).toEqual([]);
    expect(overlayPanels()).toEqual([]);
  });

  it('emits nothing when a dialog that holds an open select is destroyed', async () => {
    for (const sheet of [false, true]) {
      const { fixture, host } = await mountSelect(DIALOG, true, sheet);
      host.openDialog();
      await settle(fixture);
      await wait(20);
      triggerOf(document.body).click();
      await settle(fixture);
      expect(searchInput()).not.toBeNull();
      await teardown();
      expect(reported()).toEqual([]);
      expect(overlayPanels()).toEqual([]);
    }
  });
});
