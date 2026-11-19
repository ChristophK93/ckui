import { userEvent } from 'vitest/browser';
import { cleanUp, mount, searchInput, settle, triggerOf } from '../testing/select-host';

const MANY = 1200;

const TEMPLATE = `<ck-select aria-label="Item" filter [(value)]="value">
  @for (name of countries(); track name) { <ck-option [value]="name">{{ name }}</ck-option> }
</ck-select>`;

describe('CkSelect with many options', () => {
  afterEach(cleanUp);

  async function elapsed(
    fixture: Parameters<typeof settle>[0],
    action: () => Promise<void> | void,
  ) {
    const start = performance.now();
    await action();
    await settle(fixture);
    return performance.now() - start;
  }

  // The bounds are about ten times what a laptop needs: they catch a return of the per-option
  // work (thrown errors for unbound inputs, a text read per option per keystroke), not jitter.
  it('mounts, opens and filters on each keystroke without lagging', async () => {
    const mountStart = performance.now();
    const { fixture, root } = mount(TEMPLATE, (host) =>
      host.countries.set(Array.from({ length: MANY }, (_, index) => `Item ${index}`)),
    );
    await settle(fixture);
    const mountMillis = performance.now() - mountStart;
    const trigger = triggerOf(root);
    trigger.focus();
    const openMillis = await elapsed(fixture, () => trigger.click());
    expect(searchInput()).not.toBeNull();
    const keyMillis: number[] = [];
    for (const key of ['i', 't', 'e', 'm', ' ', '9']) {
      keyMillis.push(await elapsed(fixture, () => userEvent.keyboard(key)));
    }
    const shown = () => document.querySelectorAll('.ck-option:not([hidden])').length;
    expect(shown()).toBe(111);
    expect(mountMillis).toBeLessThan(2000);
    expect(openMillis).toBeLessThan(1000);
    expect(Math.max(...keyMillis)).toBeLessThan(1000);
  });

  it('clears the filter on the next keystroke back to empty without lagging', async () => {
    const { fixture, root } = mount(TEMPLATE, (host) =>
      host.countries.set(Array.from({ length: MANY }, (_, index) => `Item ${index}`)),
    );
    await settle(fixture);
    triggerOf(root).focus();
    triggerOf(root).click();
    await settle(fixture);
    await userEvent.keyboard('item 99');
    await settle(fixture);
    const millis = await elapsed(fixture, () =>
      userEvent.keyboard('{Control>}a{/Control}{Backspace}'),
    );
    expect(document.querySelectorAll('.ck-option[hidden]').length).toBe(0);
    expect(millis).toBeLessThan(1000);
  });
});
