import { userEvent } from 'vitest/browser';
import {
  KINDS,
  activeOption,
  cleanUp,
  fakeMedia,
  listbox,
  mount,
  popup,
  press,
  settle,
  triggerOf,
  wait,
} from '../testing/select-host';

const KIND_SELECT = `<button type="button" id="before">Before</button>
  <ck-select aria-label="Target" [(value)]="value">${KINDS}</ck-select>
  <button type="button" id="after">After</button>`;

const COUNTRY_SELECT = `<ck-select aria-label="Country" [(value)]="value">
  @for (name of countries(); track name) { <ck-option [value]="name">{{ name }}</ck-option> }
</ck-select>`;

const GROUPED = `<ck-select aria-label="Target" [(value)]="value">
  <ck-optgroup label="One"><ck-option value="a1">Apple</ck-option><ck-option value="a2" disabled>Avocado</ck-option></ck-optgroup>
  <ck-optgroup label="Two" disabled><ck-option value="b1">Banana</ck-option></ck-optgroup>
  <ck-optgroup label="Three"><ck-option value="c1">Cherry</ck-option><ck-option value="a3">Apricot</ck-option></ck-optgroup>
</ck-select>`;

const activeText = (): string | null => activeOption()?.textContent!.trim() ?? null;

/** A key press followed by everything the page does about it. */
async function tap(
  fixture: Parameters<typeof settle>[0],
  element: Element,
  key: string,
  init: KeyboardEventInit = {},
): Promise<KeyboardEvent> {
  const event = press(element, key, init);
  await settle(fixture);
  return event;
}

describe('CkSelect keyboard', () => {
  afterEach(cleanUp);

  async function start(template = KIND_SELECT, prepare?: Parameters<typeof mount>[1]) {
    const mounted = mount(template, prepare);
    await settle(mounted.fixture);
    const trigger = triggerOf(mounted.root);
    trigger.focus();
    return { ...mounted, trigger };
  }

  describe('closed', () => {
    it.each([
      ['ArrowDown', {}],
      ['Enter', {}],
      [' ', {}],
      ['ArrowDown', { altKey: true }],
    ])(
      'opens on %s %j with the first option highlighted when nothing is selected',
      async (key, init) => {
        const { fixture, trigger } = await start();
        const event = press(trigger, key, init);
        await settle(fixture);
        expect(event.defaultPrevented).toBe(true);
        expect(popup()).not.toBeNull();
        expect(activeText()).toBe('% FTP');
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(trigger);
      },
    );

    it.each(['ArrowDown', 'Enter', ' ', 'ArrowUp'])(
      'opens on %s with the selected option highlighted',
      async (key) => {
        const { fixture, trigger } = await start(KIND_SELECT, (host) => host.value.set('watt'));
        press(trigger, key);
        await settle(fixture);
        expect(activeText()).toBe('Watts');
        expect(trigger.getAttribute('aria-activedescendant')).toBe(activeOption()!.id);
      },
    );

    it('opens on ArrowUp with the last enabled option highlighted when nothing is selected', async () => {
      const { fixture, trigger } = await start();
      press(trigger, 'ArrowUp');
      await settle(fixture);
      expect(activeText()).toBe('Level');
    });

    it('opens on Home and End with the first and last enabled option highlighted', async () => {
      const { fixture, trigger } = await start(KIND_SELECT, (host) => host.value.set('watt'));
      press(trigger, 'End');
      await settle(fixture);
      expect(activeText()).toBe('Level');
      press(trigger, 'Escape');
      await settle(fixture);
      press(trigger, 'Home');
      await settle(fixture);
      expect(activeText()).toBe('% FTP');
    });

    it('highlights the first enabled option when the selected one is disabled', async () => {
      const { fixture, trigger } = await start(KIND_SELECT, (host) => host.value.set('free'));
      press(trigger, 'ArrowDown');
      await settle(fixture);
      expect(activeText()).toBe('% FTP');
    });

    it('ignores Alt+ArrowUp, Ctrl and Meta combinations, Tab and other keys', async () => {
      const { fixture, trigger } = await start();
      for (const [key, init] of [
        ['ArrowUp', { altKey: true }],
        ['ArrowDown', { ctrlKey: true }],
        ['Enter', { metaKey: true }],
        ['Tab', {}],
        ['Shift', {}],
        ['F5', {}],
        ['Escape', {}],
        ['a', { ctrlKey: true }],
      ] as const) {
        const event = press(trigger, key, init);
        expect(event.defaultPrevented, `${key} ${JSON.stringify(init)}`).toBe(false);
      }
      await settle(fixture);
      expect(popup()).toBeNull();
    });

    it('opens exactly once with a real Enter key press and a real Space key press', async () => {
      const { fixture, trigger, host } = await start();
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      expect(popup()).not.toBeNull();
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      expect(popup()).toBeNull();
      await userEvent.keyboard(' ');
      await settle(fixture);
      expect(popup()).not.toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      await userEvent.keyboard('{ArrowDown}{Enter}');
      await settle(fixture);
      expect(popup()).toBeNull();
      expect(host.value()).toBe('watt');
    });

    describe('typeahead', () => {
      it('selects the next option that starts with the typed letter without opening', async () => {
        const { fixture, trigger, host } = await start(COUNTRY_SELECT);
        press(trigger, 'g');
        await settle(fixture);
        expect(host.value()).toBe('Germany');
        expect(popup()).toBeNull();
        expect(trigger.textContent).toContain('Germany');
      });

      it('cycles through the options of the same letter when it is repeated', async () => {
        const { fixture, trigger, host } = await start(COUNTRY_SELECT);
        const seen: unknown[] = [];
        for (let step = 0; step < 5; step++) {
          press(trigger, 'g');
          await settle(fixture);
          seen.push(host.value());
        }
        expect(seen).toEqual(['Germany', 'Ghana', 'Greece', 'Germany', 'Ghana']);
      });

      it('narrows to a longer prefix typed in a row, ignoring case and accents', async () => {
        const { fixture, trigger, host } = await start(COUNTRY_SELECT);
        press(trigger, 'G');
        press(trigger, 'h');
        await settle(fixture);
        expect(host.value()).toBe('Ghana');
        await wait(550);
        press(trigger, 't');
        press(trigger, 'u');
        await settle(fixture);
        expect(host.value()).toBe('Türkiye');
      });

      it('starts a new search after the pause', async () => {
        const { fixture, trigger, host } = await start(COUNTRY_SELECT);
        press(trigger, 'p');
        press(trigger, 'o');
        await settle(fixture);
        expect(host.value()).toBe('Poland');
        await wait(550);
        press(trigger, 'p');
        await settle(fixture);
        expect(host.value()).toBe('Portugal');
      });

      it('does nothing when nothing starts with the typed text and keeps the selection', async () => {
        const { fixture, trigger, host } = await start(COUNTRY_SELECT, (value) =>
          value.value.set('Spain'),
        );
        press(trigger, 'q');
        await settle(fixture);
        expect(host.value()).toBe('Spain');
      });

      it('lets a space belong to a running search and opens when there is none', async () => {
        const { fixture, trigger, host } = await start(
          `<ck-select aria-label="Target" [(value)]="value">
            <ck-option value="1">New Delhi</ck-option><ck-option value="2">New York</ck-option><ck-option value="3">Newark</ck-option>
          </ck-select>`,
        );
        press(trigger, 'n');
        press(trigger, 'e');
        press(trigger, 'w');
        const space = press(trigger, ' ');
        press(trigger, 'y');
        await settle(fixture);
        expect(space.defaultPrevented).toBe(true);
        expect(host.value()).toBe('2');
        expect(popup()).toBeNull();
        await wait(550);
        press(trigger, ' ');
        await settle(fixture);
        expect(popup()).not.toBeNull();
      });

      it('skips disabled options', async () => {
        const { fixture, trigger, host } = await start(GROUPED);
        press(trigger, 'a');
        await settle(fixture);
        expect(host.value()).toBe('a1');
        await wait(550);
        press(trigger, 'a');
        await settle(fixture);
        expect(host.value()).toBe('a3');
        await wait(550);
        press(trigger, 'b');
        await settle(fixture);
        expect(host.value()).toBe('a3');
      });

      it('accepts a character typed with AltGr', async () => {
        const { fixture, trigger, host } = await start(
          `<ck-select aria-label="Target" [(value)]="value"><ck-option value="1">&#64;home</ck-option></ck-select>`,
        );
        press(trigger, '@', { ctrlKey: true, altKey: true, modifierAltGraph: true });
        await settle(fixture);
        expect(host.value()).toBe('1');
      });
    });
  });

  describe('open', () => {
    it('moves with ArrowDown and ArrowUp without wrapping and skips disabled options', async () => {
      const { fixture, trigger } = await start();
      await tap(fixture, trigger, 'ArrowDown');
      const seen = [activeText()];
      for (let step = 0; step < 4; step++) {
        await tap(fixture, trigger, 'ArrowDown');
        seen.push(activeText());
      }
      expect(seen).toEqual(['% FTP', 'Watts', 'Level', 'Level', 'Level']);
      for (let step = 0; step < 4; step++) {
        await tap(fixture, trigger, 'ArrowUp');
      }
      expect(activeText()).toBe('% FTP');
      expect(trigger.getAttribute('aria-activedescendant')).toBe(activeOption()!.id);
    });

    it('skips disabled options and options of a disabled group in the middle', async () => {
      const { fixture, trigger } = await start(GROUPED);
      await tap(fixture, trigger, 'ArrowDown');
      const seen = [activeText()];
      await tap(fixture, trigger, 'ArrowDown');
      seen.push(activeText());
      await tap(fixture, trigger, 'ArrowDown');
      seen.push(activeText());
      expect(seen).toEqual(['Apple', 'Cherry', 'Apricot']);
    });

    it('goes to the first and last enabled option with Home and End', async () => {
      const { fixture, trigger } = await start(COUNTRY_SELECT);
      await tap(fixture, trigger, 'ArrowDown');
      await tap(fixture, trigger, 'End');
      expect(activeText()).toBe('Türkiye');
      await tap(fixture, trigger, 'Home');
      expect(activeText()).toBe('Austria');
    });

    it('moves ten with PageDown and PageUp and stops at the ends', async () => {
      const { fixture, trigger } = await start(COUNTRY_SELECT);
      await tap(fixture, trigger, 'ArrowDown');
      const seen: (string | null)[] = [];
      for (let step = 0; step < 4; step++) {
        await tap(fixture, trigger, 'PageDown');
        seen.push(activeText());
      }
      for (let step = 0; step < 4; step++) {
        await tap(fixture, trigger, 'PageUp');
        seen.push(activeText());
      }
      expect(seen).toEqual([
        'Ghana',
        'Netherlands',
        'Türkiye',
        'Türkiye',
        'Mexico',
        'Germany',
        'Austria',
        'Austria',
      ]);
    });

    it('scrolls the highlighted option into view inside the list only', async () => {
      const { fixture, trigger } = await start(
        `<div style="block-size: 2000px"></div>${COUNTRY_SELECT}<div style="block-size: 2000px"></div>`,
      );
      trigger.scrollIntoView({ block: 'center' });
      const pageScroll = window.scrollY;
      press(trigger, 'ArrowDown');
      await settle(fixture);
      press(trigger, 'End');
      await settle(fixture);
      const list = listbox()!;
      const option = activeOption()!;
      expect(list.scrollTop).toBeGreaterThan(0);
      const listRect = list.getBoundingClientRect();
      const optionRect = option.getBoundingClientRect();
      expect(optionRect.bottom).toBeLessThanOrEqual(listRect.bottom + 1);
      expect(optionRect.top).toBeGreaterThanOrEqual(listRect.top - 1);
      expect(window.scrollY).toBe(pageScroll);
    });

    it('selects the highlighted option and closes on Enter and on Space', async () => {
      const { fixture, trigger, host } = await start();
      press(trigger, 'ArrowDown');
      press(trigger, 'ArrowDown');
      const enter = press(trigger, 'Enter');
      await settle(fixture);
      expect(enter.defaultPrevented).toBe(true);
      expect(host.value()).toBe('watt');
      expect(popup()).toBeNull();
      expect(document.activeElement).toBe(trigger);
      press(trigger, 'ArrowDown');
      press(trigger, 'ArrowDown');
      const space = press(trigger, ' ');
      await settle(fixture);
      expect(space.defaultPrevented).toBe(true);
      expect(host.value()).toBe('level');
      expect(popup()).toBeNull();
    });

    it('selects and closes on Alt+ArrowUp', async () => {
      const { fixture, trigger, host } = await start();
      press(trigger, 'ArrowDown');
      press(trigger, 'ArrowDown');
      press(trigger, 'ArrowUp', { altKey: true });
      await settle(fixture);
      expect(host.value()).toBe('watt');
      expect(popup()).toBeNull();
    });

    it('closes on Escape without a change and keeps focus on the trigger', async () => {
      const { fixture, trigger, host } = await start(KIND_SELECT, (value) =>
        value.value.set('ftp'),
      );
      press(trigger, 'ArrowDown');
      press(trigger, 'ArrowDown');
      const escape = press(trigger, 'Escape');
      await settle(fixture);
      expect(escape.defaultPrevented).toBe(true);
      expect(host.value()).toBe('ftp');
      expect(popup()).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('selects the highlighted option on Tab and lets focus move on', async () => {
      const { fixture, trigger, host } = await start();
      press(trigger, 'ArrowDown');
      press(trigger, 'ArrowDown');
      await settle(fixture);
      await userEvent.tab();
      await settle(fixture);
      expect(host.value()).toBe('watt');
      expect(popup()).toBeNull();
      expect(document.activeElement!.id).toBe('after');
    });

    it('selects on Shift+Tab and moves focus backwards', async () => {
      const { fixture, trigger, host } = await start();
      press(trigger, 'ArrowDown');
      press(trigger, 'ArrowDown');
      await settle(fixture);
      await userEvent.tab({ shift: true });
      await settle(fixture);
      expect(host.value()).toBe('watt');
      expect(document.activeElement!.id).toBe('before');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('moves the highlight by typeahead and selects it with Enter', async () => {
      const { fixture, trigger, host } = await start(COUNTRY_SELECT);
      await tap(fixture, trigger, 'ArrowDown');
      await tap(fixture, trigger, 'f');
      expect(activeText()).toBe('Finland');
      await tap(fixture, trigger, 'f');
      expect(activeText()).toBe('France');
      await tap(fixture, trigger, 'f');
      expect(activeText()).toBe('Finland');
      expect(host.value()).toBeNull();
      press(trigger, 'Enter');
      await settle(fixture);
      expect(host.value()).toBe('Finland');
    });

    it('treats a space as part of a running typeahead and not as a selection', async () => {
      const { fixture, trigger, host } = await start(
        `<ck-select aria-label="Target" [(value)]="value">
          <ck-option value="1">Sweet Spot</ck-option><ck-option value="2">Sweet Tooth</ck-option>
        </ck-select>`,
      );
      press(trigger, 'ArrowDown');
      await settle(fixture);
      for (const key of ['s', 'w', 'e', 'e', 't', ' ', 't']) {
        press(trigger, key);
      }
      await settle(fixture);
      expect(activeText()).toBe('Sweet Tooth');
      expect(host.value()).toBeNull();
      expect(popup()).not.toBeNull();
    });

    it('opens, moves and selects with the real keyboard and real key repeat', async () => {
      const { fixture, host } = await start(COUNTRY_SELECT);
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{PageDown}{End}{Enter}');
      await settle(fixture);
      expect(host.value()).toBe('Türkiye');
    });

    it('prevents the default of every key it handles, so the page does not scroll', async () => {
      const { fixture, trigger } = await start(COUNTRY_SELECT);
      press(trigger, 'ArrowDown');
      await settle(fixture);
      for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp', 'k']) {
        expect(press(trigger, key).defaultPrevented, key).toBe(true);
      }
      expect(press(trigger, ' ').defaultPrevented).toBe(true);
    });
  });

  describe('as a sheet', () => {
    it('takes the same keys on the focused list and returns focus to the trigger', async () => {
      fakeMedia(true);
      const { fixture, trigger, host } = await start(COUNTRY_SELECT);
      trigger.click();
      await settle(fixture);
      const list = listbox()!;
      expect(document.activeElement).toBe(list);
      await tap(fixture, list, 'ArrowDown');
      await tap(fixture, list, 'PageDown');
      await tap(fixture, list, 'g');
      expect(activeText()).toBe('Germany');
      await tap(fixture, list, 'End');
      expect(activeText()).toBe('Türkiye');
      await tap(fixture, list, 'Home');
      expect(activeText()).toBe('Austria');
      await tap(fixture, list, 'ArrowUp');
      expect(activeText()).toBe('Austria');
      await tap(fixture, list, 'ArrowDown');
      await tap(fixture, list, 'Enter');
      await wait(20);
      expect(host.value()).toBe('Belgium');
      expect(popup()).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('closes on Escape without a change and on Alt+ArrowUp with one', async () => {
      fakeMedia(true);
      const { fixture, trigger, host } = await start(KIND_SELECT);
      trigger.click();
      await settle(fixture);
      await tap(fixture, listbox()!, 'ArrowDown');
      await tap(fixture, listbox()!, 'Escape');
      await wait(20);
      expect(host.value()).toBeNull();
      expect(document.activeElement).toBe(trigger);
      trigger.click();
      await settle(fixture);
      await tap(fixture, listbox()!, 'ArrowDown');
      await tap(fixture, listbox()!, 'ArrowUp', { altKey: true });
      await wait(20);
      expect(host.value()).toBe('watt');
    });

    it('selects on Tab and does not trap the user in the sheet', async () => {
      fakeMedia(true);
      const { fixture, trigger, host } = await start(KIND_SELECT);
      trigger.click();
      await settle(fixture);
      await tap(fixture, listbox()!, 'ArrowDown');
      await tap(fixture, listbox()!, 'ArrowDown');
      await tap(fixture, listbox()!, 'Tab');
      await wait(20);
      expect(host.value()).toBe('level');
      expect(popup()).toBeNull();
    });
  });
});
