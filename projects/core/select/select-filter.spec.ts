import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { userEvent } from 'vitest/browser';
import {
  COUNTRIES,
  KINDS,
  activeOption,
  cleanUp,
  fakeMedia,
  labelsOf,
  listbox,
  mount,
  optionsOf,
  popup,
  press,
  searchInput,
  settle,
  shownValue,
  triggerOf,
  wait,
} from '../testing/select-host';

const COUNTRY_FILTER = `<ck-select aria-label="Country" filter [(value)]="value" [filterWith]="filterWith()">
  @for (name of countries(); track name) { <ck-option [value]="name">{{ name }}</ck-option> }
</ck-select>`;

const live = (): string =>
  Array.from(document.querySelectorAll('.cdk-live-announcer-element'))
    .map((element) => element.textContent!.trim())
    .join('|');

const activeText = (): string | null => activeOption()?.textContent!.trim() ?? null;

describe('CkSelect filter', () => {
  afterEach(cleanUp);

  async function start(
    template = COUNTRY_FILTER,
    prepare?: Parameters<typeof mount>[1],
    sheet = false,
  ) {
    if (sheet) {
      fakeMedia(true);
    }
    const mounted = mount(template, (host) => {
      (host as unknown as { filterWith: unknown }).filterWith = () => undefined;
      prepare?.(host);
    });
    await settle(mounted.fixture);
    const trigger = triggerOf(mounted.root);
    trigger.focus();
    return { ...mounted, trigger };
  }

  async function openAndType(
    text: string,
    template?: string,
    prepare?: Parameters<typeof mount>[1],
  ) {
    const started = await start(template, prepare);
    started.trigger.click();
    await settle(started.fixture);
    await userEvent.keyboard(text);
    await settle(started.fixture);
    return started;
  }

  describe('the search field', () => {
    it('is a search combobox above the list and takes focus on open', async () => {
      const { fixture, trigger } = await start();
      trigger.click();
      await settle(fixture);
      const input = searchInput()!;
      expect(input.type).toBe('search');
      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(input.getAttribute('aria-controls')).toBe(listbox()!.id);
      expect(input.getAttribute('aria-label')).toBe('Country Search');
      expect(input.getAttribute('aria-activedescendant')).toBe(optionsOf()[0].id);
      expect(document.activeElement).toBe(input);
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
      expect(input.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        listbox()!.getBoundingClientRect().top + 1,
      );
    });

    it('is absent without the filter input', async () => {
      const { fixture, root } = mount(
        `<ck-select aria-label="Target" [(value)]="value">${KINDS}</ck-select>`,
      );
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      expect(searchInput()).toBeNull();
    });

    it('uses the search label of the labels token', async () => {
      TestBed.configureTestingModule({
        providers: [provideCkui({ labels: { search: 'Suche', resultCount: '{count} Treffer' } })],
      });
      const { fixture, trigger } = await start();
      trigger.click();
      await settle(fixture);
      expect(searchInput()!.getAttribute('aria-label')).toBe('Country Suche');
    });

    it('starts with the selected option highlighted and scrolled to', async () => {
      const { fixture, trigger } = await start(COUNTRY_FILTER, (host) => host.value.set('Spain'));
      trigger.click();
      await settle(fixture);
      expect(activeText()).toBe('Spain');
      expect(searchInput()!.getAttribute('aria-activedescendant')).toBe(activeOption()!.id);
      expect(listbox()!.scrollTop).toBeGreaterThan(0);
    });

    it('keeps the typed text as the user types, one character at a time', async () => {
      await openAndType('ger');
      expect(searchInput()!.value).toBe('ger');
      expect(document.activeElement).toBe(searchInput());
      expect(labelsOf()).toEqual(['Germany']);
    });

    it('does not submit a form on Enter in the search field and lets a space be typed', async () => {
      const { fixture, host } = await start(
        `<form (submit)="$event.preventDefault(); submits.update((count) => count + 1)">${COUNTRY_FILTER}</form>`,
      );
      triggerOf(document.body).click();
      await settle(fixture);
      await userEvent.keyboard('new ');
      expect(searchInput()!.value).toBe('new ');
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      expect(host.submits()).toBe(0);
    });
  });

  describe('matching', () => {
    it('matches anywhere in the text, ignoring case', async () => {
      await openAndType('LAND');
      expect(labelsOf()).toEqual([
        'Finland',
        'Iceland',
        'Ireland',
        'Netherlands',
        'Poland',
        'Switzerland',
      ]);
    });

    it('ignores accents in the option and in the query', async () => {
      await openAndType('turk');
      expect(labelsOf()).toEqual(['Türkiye']);
      searchInput()!.select();
      await userEvent.keyboard('TÜRK');
      expect(labelsOf()).toEqual(['Türkiye']);
    });

    it('matches decomposed and precomposed accents alike', async () => {
      const { fixture } = await start(
        `<ck-select aria-label="Name" filter [(value)]="value">
          <ck-option value="1">Rene</ck-option><ck-option value="2">René</ck-option><ck-option value="3">Rénée</ck-option>
        </ck-select>`,
      );
      triggerOf(document.body).click();
      await settle(fixture);
      await userEvent.keyboard('rené');
      await settle(fixture);
      expect(optionsOf().length).toBe(3);
    });

    it('shows everything again for an empty or blank query', async () => {
      const { fixture } = await openAndType('zzz');
      expect(labelsOf()).toEqual([]);
      searchInput()!.select();
      await userEvent.keyboard('{Backspace}');
      await settle(fixture);
      expect(optionsOf().length).toBe(30);
      await userEvent.keyboard('   ');
      await settle(fixture);
      expect(optionsOf().length).toBe(30);
    });

    it('uses filterWith instead when it is given', async () => {
      await openAndType('la', undefined, (host) => {
        (host as unknown as { filterWith: unknown }).filterWith =
          () => (option: { text: string }, query: string) =>
            option.text.toLowerCase().startsWith(query);
      });
      // The default would also find Finland, Iceland, Poland, ...; "starts with" finds none of those.
      expect(labelsOf()).toEqual([]);
    });

    it('hands filterWith the option, with its value and text, and the query as typed', async () => {
      const seen: { value: unknown; text: string; query: string }[] = [];
      await openAndType('Pe', undefined, (host) => {
        (host as unknown as { filterWith: unknown }).filterWith =
          () => (option: { value(): unknown; text: string }, query: string) => {
            seen.push({ value: option.value(), text: option.text, query });
            return option.value() === 'Peru';
          };
      });
      expect(labelsOf()).toEqual(['Peru']);
      expect(seen.at(-1)).toEqual({ value: 'Türkiye', text: 'Türkiye', query: 'Pe' });
    });

    it('hides a group without a match and shows the one with', async () => {
      const { fixture } = await start(
        `<ck-select aria-label="Target" filter [(value)]="value">
          <ck-optgroup label="Fruit"><ck-option value="a">Apple</ck-option><ck-option value="b">Banana</ck-option></ck-optgroup>
          <ck-optgroup label="Veg"><ck-option value="c">Carrot</ck-option></ck-optgroup>
        </ck-select>`,
      );
      triggerOf(document.body).click();
      await settle(fixture);
      await userEvent.keyboard('carr');
      await settle(fixture);
      const groups = Array.from(document.querySelectorAll<HTMLElement>('ck-optgroup'));
      expect(groups.map((group) => group.hidden)).toEqual([true, false]);
      expect(labelsOf()).toEqual(['Carrot']);
    });

    it('does not filter a select without the filter input, whatever filterWith says', async () => {
      const { fixture, root } = mount(
        `<ck-select aria-label="Target" [(value)]="value" [filterWith]="never">${KINDS}</ck-select>`,
        (host) => ((host as unknown as { never: unknown }).never = () => false),
      );
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      expect(optionsOf().length).toBe(4);
    });
  });

  describe('keys in the search field', () => {
    it('moves the highlight to the first match when the text changes', async () => {
      const { fixture } = await openAndType('o');
      expect(activeText()).toBe(labelsOf()[0]);
      expect(activeText()).toBe('Croatia');
      expect(searchInput()!.getAttribute('aria-activedescendant')).toBe(activeOption()!.id);
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      await settle(fixture);
      expect(activeText()).not.toBe('Brazil');
      await userEvent.keyboard('r');
      await settle(fixture);
      expect(activeText()).toBe(labelsOf()[0]);
    });

    it('moves with ArrowDown and ArrowUp, PageDown and PageUp inside the matches without wrapping', async () => {
      const { fixture } = await openAndType('a');
      const matches = labelsOf();
      expect(matches.length).toBeGreaterThan(12);
      await userEvent.keyboard('{ArrowUp}');
      await settle(fixture);
      expect(activeText()).toBe(matches[0]);
      await userEvent.keyboard('{PageDown}');
      await settle(fixture);
      expect(activeText()).toBe(matches[10]);
      await userEvent.keyboard('{PageDown}{PageDown}');
      await settle(fixture);
      expect(activeText()).toBe(matches.at(-1));
      await userEvent.keyboard('{PageUp}');
      await settle(fixture);
      expect(activeText()).toBe(matches[matches.length - 11]);
    });

    it('leaves Home and End to the text field and does not move the highlight', async () => {
      const { fixture } = await openAndType('an');
      const before = activeText();
      const home = press(searchInput()!, 'Home');
      const end = press(searchInput()!, 'End');
      await settle(fixture);
      expect(home.defaultPrevented).toBe(false);
      expect(end.defaultPrevented).toBe(false);
      expect(activeText()).toBe(before);
    });

    it('does not use typeahead and does not treat Space as a selection', async () => {
      const { fixture, host } = await openAndType('lan');
      await userEvent.keyboard(' ');
      await settle(fixture);
      expect(searchInput()!.value).toBe('lan ');
      expect(popup()).not.toBeNull();
      expect(host.value()).toBeNull();
    });

    it('selects the highlighted match on Enter, closes, clears the text and returns focus', async () => {
      const { fixture, trigger, host } = await openAndType('ger');
      await userEvent.keyboard('{Enter}');
      await settle(fixture);
      expect(host.value()).toBe('Germany');
      expect(shownValue(document.body)).toBe('Germany');
      expect(popup()).toBeNull();
      expect(document.activeElement).toBe(trigger);
      trigger.click();
      await settle(fixture);
      expect(searchInput()!.value).toBe('');
      expect(optionsOf().length).toBe(30);
    });

    it('selects on Alt+ArrowUp', async () => {
      const { fixture, host } = await openAndType('ir');
      await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
      await settle(fixture);
      expect(host.value()).toBe('Ireland');
    });

    it('closes on Escape without a change, keeping the old value and clearing the text', async () => {
      const { fixture, trigger, host } = await openAndType('ger', COUNTRY_FILTER, (value) =>
        value.value.set('Spain'),
      );
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      expect(host.value()).toBe('Spain');
      expect(popup()).toBeNull();
      expect(document.activeElement).toBe(trigger);
      trigger.click();
      await settle(fixture);
      expect(searchInput()!.value).toBe('');
    });

    it('selects the highlighted match on Tab, closes and moves focus on', async () => {
      const { fixture, host } = await start(
        `${COUNTRY_FILTER}<button type="button" id="after">After</button>`,
      );
      triggerOf(document.body).click();
      await settle(fixture);
      await userEvent.keyboard('swe');
      await userEvent.tab();
      await settle(fixture);
      expect(host.value()).toBe('Sweden');
      expect(popup()).toBeNull();
      expect(document.activeElement!.id).toBe('after');
    });

    it('does nothing on Enter and Tab when there is no match, and Tab still moves on', async () => {
      const { fixture, host } = await start(
        `${COUNTRY_FILTER}<button type="button" id="after">After</button>`,
        (value) => value.value.set('Spain'),
      );
      triggerOf(document.body).click();
      await settle(fixture);
      await userEvent.keyboard('qqq{Enter}');
      await settle(fixture);
      expect(host.value()).toBe('Spain');
      expect(popup()).not.toBeNull();
      await userEvent.tab();
      await settle(fixture);
      expect(host.value()).toBe('Spain');
      expect(popup()).toBeNull();
    });
  });

  describe('no results', () => {
    it('shows a row that cannot be picked and has no highlight', async () => {
      const { fixture, host } = await openAndType('zzz');
      const empty = document.querySelector<HTMLElement>('.ck-select-listbox__empty')!;
      expect(empty.textContent!.trim()).toBe('No results');
      expect(empty.getAttribute('role')).toBe('option');
      expect(empty.getAttribute('aria-disabled')).toBe('true');
      expect(activeOption()).toBeNull();
      expect(searchInput()!.hasAttribute('aria-activedescendant')).toBe(false);
      empty.click();
      await settle(fixture);
      expect(host.value()).toBeNull();
      expect(popup()).not.toBeNull();
    });

    it('goes away again when the text matches', async () => {
      const { fixture } = await openAndType('zzz');
      searchInput()!.select();
      await userEvent.keyboard('peru');
      await settle(fixture);
      expect(document.querySelector('.ck-select-listbox__empty')).toBeNull();
      expect(labelsOf()).toEqual(['Peru']);
    });

    it('is also shown for a select without any option', async () => {
      const { fixture } = await start(
        `<ck-select aria-label="Country" filter [(value)]="value"></ck-select>`,
      );
      triggerOf(document.body).click();
      await settle(fixture);
      expect(document.querySelector('.ck-select-listbox__empty')).not.toBeNull();
    });

    it('uses the noResults label', async () => {
      TestBed.configureTestingModule({
        providers: [provideCkui({ labels: { noResults: 'Nichts gefunden' } })],
      });
      await openAndType('zzz');
      expect(document.querySelector('.ck-select-listbox__empty')!.textContent!.trim()).toBe(
        'Nichts gefunden',
      );
    });
  });

  describe('announcement', () => {
    it('says nothing when the list opens', async () => {
      const { fixture, trigger } = await start();
      trigger.click();
      await settle(fixture);
      await wait(700);
      expect(live()).not.toContain('results');
    });

    it('announces the count once, about half a second after typing stops', async () => {
      const { fixture } = await openAndType('g');
      expect(live()).not.toContain('results');
      await userEvent.keyboard('r');
      await wait(300);
      expect(live()).not.toContain('results');
      await wait(450);
      await settle(fixture);
      const matching = (query: string) =>
        COUNTRIES.filter((name) => name.toLowerCase().includes(query)).length;
      expect(live()).toContain(`${matching('gr')} result${matching('gr') === 1 ? '' : 's'}`);
      await userEvent.keyboard('e');
      await wait(650);
      expect(live()).toContain(`${matching('gre')} result${matching('gre') === 1 ? '' : 's'}`);
    });

    it('announces no results with the noResults label', async () => {
      await openAndType('zzz');
      await wait(650);
      expect(live()).toContain('No results');
    });

    it('formats the number for the locale and uses the label token', async () => {
      TestBed.configureTestingModule({
        providers: [provideCkui({ labels: { resultCount: '{count} Treffer, {count}' } })],
      });
      await openAndType('item', COUNTRY_FILTER, (host) =>
        host.countries.set(Array.from({ length: 1000 }, (_, index) => `Item ${index}`)),
      );
      await wait(650);
      expect(live()).toContain('1,000 Treffer, 1,000');
    });

    it('says "1 result" for one match, "2 results" for two and the noResults text for none', async () => {
      await openAndType('turk');
      await wait(650);
      expect(live()).toContain('1 result');
      expect(live()).not.toContain('1 results');
      searchInput()!.select();
      await userEvent.keyboard('sw');
      await wait(650);
      expect(live()).toContain('2 results');
      searchInput()!.select();
      await userEvent.keyboard('zzz');
      await wait(650);
      expect(live()).toContain('No results');
    });

    it('uses a resultCountOne override for one result', async () => {
      TestBed.configureTestingModule({
        providers: [provideCkui({ labels: { resultCountOne: 'Ein Treffer' } })],
      });
      await openAndType('turk');
      await wait(650);
      expect(live()).toContain('Ein Treffer');
    });

    it('follows the plural rules of the locale', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'ru' }] });
      // Russian: 21 is "one", so it reads as one result; 22 is not.
      await openAndType('item', COUNTRY_FILTER, (host) =>
        host.countries.set(Array.from({ length: 21 }, (_, index) => `Item ${index}`)),
      );
      await wait(650);
      expect(live()).toContain('21 result');
      expect(live()).not.toContain('21 results');
    });

    it('does not announce after the list closed or from an earlier typing', async () => {
      const { fixture } = await openAndType('g');
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      await wait(700);
      expect(live()).not.toContain('results');
    });

    it('does not announce when the query is cleared by closing and opening again', async () => {
      const { fixture, trigger } = await openAndType('ger');
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      trigger.click();
      await settle(fixture);
      await wait(700);
      expect(live()).not.toContain('results');
    });
  });

  describe('layout', () => {
    it('places the popover again when the list gets shorter and stays under the trigger', async () => {
      const { fixture, trigger } = await start();
      trigger.click();
      await settle(fixture);
      const before = popup()!.getBoundingClientRect();
      await userEvent.keyboard('zzz');
      await settle(fixture);
      await wait(50);
      const after = popup()!.getBoundingClientRect();
      expect(after.height).toBeLessThan(before.height);
      expect(after.top).toBeCloseTo(before.top, 0);
    });
  });

  describe('as a sheet', () => {
    it('puts the search field under the title and focuses it instead of the list', async () => {
      const { fixture, trigger } = await start(COUNTRY_FILTER, undefined, true);
      trigger.click();
      await settle(fixture);
      const panel = document.querySelector<HTMLElement>('.ck-overlay--sheet')!;
      const title = panel.querySelector('.ck-select-popup__title')!.getBoundingClientRect();
      const input = searchInput()!;
      expect(input.getBoundingClientRect().top).toBeGreaterThanOrEqual(title.bottom - 1);
      expect(document.activeElement).toBe(input);
      expect(listbox()!.hasAttribute('tabindex')).toBe(false);
      expect(listbox()!.hasAttribute('aria-activedescendant')).toBe(false);
      expect(input.getAttribute('aria-activedescendant')).toBe(optionsOf()[0].id);
    });

    it('keeps the sheet the same height while typing, so the search field stays put', async () => {
      const { fixture, trigger } = await start(COUNTRY_FILTER, undefined, true);
      trigger.click();
      await settle(fixture);
      const panel = document.querySelector<HTMLElement>('.ck-overlay--sheet')!;
      const before = panel.getBoundingClientRect();
      const inputTop = searchInput()!.getBoundingClientRect().top;
      await userEvent.keyboard('ger');
      await settle(fixture);
      expect(labelsOf()).toEqual(['Germany']);
      expect(panel.getBoundingClientRect().height).toBe(before.height);
      expect(searchInput()!.getBoundingClientRect().top).toBe(inputTop);
    });

    it('filters, picks by tap and returns focus to the trigger', async () => {
      const { fixture, trigger, host } = await start(COUNTRY_FILTER, undefined, true);
      trigger.click();
      await settle(fixture);
      await userEvent.keyboard('nor');
      await settle(fixture);
      expect(labelsOf()).toEqual(['Norway']);
      optionsOf()[0].click();
      await settle(fixture);
      await wait(20);
      expect(host.value()).toBe('Norway');
      expect(document.activeElement).toBe(trigger);
      expect(popup()).toBeNull();
    });
  });
});
