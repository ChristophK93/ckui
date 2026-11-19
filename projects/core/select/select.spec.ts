import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
  KINDS,
  activeOption,
  cleanUp,
  fakeMedia,
  labelsOf,
  listbox,
  mount,
  optionsOf,
  overlayPanels,
  popup,
  press,
  settle,
  shownValue,
  triggerOf,
  wait,
} from '../testing/select-host';

const SELECT = (attributes = '') =>
  `<ck-select aria-label="Target" placeholder="Pick one" ${attributes} [(value)]="value">${KINDS}</ck-select>`;

const REPEATED = `<ck-select aria-label="Target" [(value)]="value">
  @for (item of items(); track item.value) {
    <ck-option [value]="item.value" [disabled]="!!item.disabled">{{ item.label }}</ck-option>
  }
</ck-select>`;

describe('CkSelect', () => {
  afterEach(cleanUp);

  describe('closed', () => {
    it('is a native combobox button with the listbox popup, closed', async () => {
      const { fixture, root } = mount(SELECT());
      await settle(fixture);
      const trigger = triggerOf(root);
      expect(trigger.tagName).toBe('BUTTON');
      expect(trigger.type).toBe('button');
      expect(trigger.getAttribute('role')).toBe('combobox');
      expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
      expect(trigger.getAttribute('aria-label')).toBe('Target');
      expect(root.querySelector('ck-select')!.hasAttribute('aria-label')).toBe(false);
      expect(trigger.id).toMatch(/^ck-select-\d+$/);
    });

    it('renders no list and no overlay until it opens', async () => {
      const { fixture, root } = mount(SELECT());
      await settle(fixture);
      expect(popup()).toBeNull();
      expect(overlayPanels()).toEqual([]);
      expect(root.querySelector('ck-option')).toBeNull();
    });

    it('shows the placeholder, muted, while nothing is selected', async () => {
      const { fixture, root } = mount(SELECT());
      await settle(fixture);
      expect(shownValue(root)).toBe('Pick one');
      expect(root.querySelector('.ck-select__placeholder')).not.toBeNull();
    });

    it('shows nothing, and keeps its height, with neither value nor placeholder', async () => {
      const { fixture, root } = mount(`<ck-select aria-label="Target">${KINDS}</ck-select>`);
      await settle(fixture);
      expect(shownValue(root)).toBe('');
      expect(triggerOf(root).getBoundingClientRect().height).toBe(40);
    });

    it('shows the text of the selected option, also when it was never rendered', async () => {
      const { fixture, root } = mount(SELECT(), (host) => host.value.set('watt'));
      await settle(fixture);
      expect(shownValue(root)).toBe('Watts');
      expect(root.querySelector('.ck-select__placeholder')).toBeNull();
      expect(popup()).toBeNull();
    });

    it('follows a value that is set later and an option whose text changes or goes away', async () => {
      const { fixture, root, host } = mount(REPEATED);
      await settle(fixture);
      host.value.set('b');
      await settle(fixture);
      expect(shownValue(root)).toBe('Bravo');
      host.items.set([
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Bravo renamed' },
      ]);
      await settle(fixture);
      expect(shownValue(root)).toBe('Bravo renamed');
      host.items.set([{ value: 'a', label: 'Alpha' }]);
      await settle(fixture);
      expect(shownValue(root)).toBe('');
    });

    it('draws a custom value template for the selected option', async () => {
      const { fixture, root } = mount(
        `<ck-select aria-label="Target" placeholder="Pick one" [(value)]="value">
          <ng-template ckSelectValue let-option><b class="chosen">{{ option.value }}!</b></ng-template>
          ${KINDS}
        </ck-select>`,
        (host) => host.value.set('level'),
      );
      await settle(fixture);
      expect(root.querySelector('.chosen')!.textContent).toBe('level!');
      expect(root.querySelector('.ck-select__text')).toBeNull();
    });

    it('keeps the placeholder when a custom value template exists but nothing is selected', async () => {
      const { fixture, root } = mount(
        `<ck-select aria-label="Target" placeholder="Pick one" [(value)]="value">
          <ng-template ckSelectValue let-option><b class="chosen">{{ option.value }}</b></ng-template>
          ${KINDS}
        </ck-select>`,
      );
      await settle(fixture);
      expect(shownValue(root)).toBe('Pick one');
      expect(root.querySelector('.chosen')).toBeNull();
    });

    it('truncates a long value with an ellipsis instead of growing', async () => {
      const long = 'A very long option text that cannot possibly fit into this narrow select';
      const { fixture, root } = mount(
        `<div style="inline-size: 160px"><ck-select aria-label="Target" [(value)]="value"><ck-option value="x">${long}</ck-option></ck-select></div>`,
        (host) => host.value.set('x'),
      );
      await settle(fixture);
      const value = root.querySelector<HTMLElement>('.ck-select__value')!;
      expect(getComputedStyle(value).textOverflow).toBe('ellipsis');
      expect(value.scrollWidth).toBeGreaterThan(value.clientWidth);
      expect(root.querySelector('.ck-select')!.getBoundingClientRect().width).toBe(160);
    });

    it('rotates the chevron while open', async () => {
      const { fixture, root } = mount(SELECT());
      await settle(fixture);
      const chevron = root.querySelector<HTMLElement>('.ck-select__chevron')!;
      expect(getComputedStyle(chevron).transform).toBe('none');
      triggerOf(root).click();
      await settle(fixture);
      expect(getComputedStyle(chevron).transform).not.toBe('none');
    });
  });

  describe('open with the mouse', () => {
    it('opens a listbox popover under the trigger and wires the aria attributes', async () => {
      const { fixture, root } = mount(`<div style="inline-size: 400px">${SELECT()}</div>`);
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.click();
      await settle(fixture);
      const list = listbox()!;
      expect(list.getAttribute('role')).toBe('listbox');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(list.id);
      expect(list.getAttribute('aria-label')).toBe('Target');
      expect(labelsOf()).toEqual(['% FTP', 'Watts', 'Level', 'Free']);
      const roles = optionsOf().map((option) => option.getAttribute('role'));
      expect(roles).toEqual(['option', 'option', 'option', 'option']);
      expect(optionsOf()[3].getAttribute('aria-disabled')).toBe('true');
      expect(optionsOf()[0].hasAttribute('aria-disabled')).toBe(false);
      expect(trigger.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        popup()!.getBoundingClientRect().top + 1,
      );
      expect(popup()!.getBoundingClientRect().width).toBeGreaterThanOrEqual(
        trigger.getBoundingClientRect().width - 1,
      );
    });

    it('keeps focus on the trigger and points aria-activedescendant at the active option', async () => {
      const { fixture, root } = mount(SELECT(), (host) => host.value.set('watt'));
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      trigger.click();
      await settle(fixture);
      expect(document.activeElement).toBe(trigger);
      expect(activeOption()).toBe(optionsOf()[1]);
      expect(trigger.getAttribute('aria-activedescendant')).toBe(optionsOf()[1].id);
      expect(optionsOf()[1].getAttribute('aria-selected')).toBe('true');
      expect(optionsOf()[0].getAttribute('aria-selected')).toBe('false');
    });

    it('selects an option on click, closes, keeps focus on the trigger', async () => {
      const { fixture, root, host } = mount(SELECT());
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      trigger.click();
      await settle(fixture);
      optionsOf()[2].click();
      await settle(fixture);
      expect(host.value()).toBe('level');
      expect(shownValue(root)).toBe('Level');
      expect(popup()).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(trigger);
    });

    it('does not pick a disabled option and stays open', async () => {
      const { fixture, root, host } = mount(SELECT());
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      optionsOf()[3].click();
      await settle(fixture);
      expect(host.value()).toBeNull();
      expect(popup()).not.toBeNull();
    });

    it('closes without a change when the trigger is clicked again', async () => {
      const { fixture, root, host } = mount(SELECT(), (host) => host.value.set('ftp'));
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.click();
      await settle(fixture);
      trigger.click();
      await settle(fixture);
      expect(popup()).toBeNull();
      expect(host.value()).toBe('ftp');
    });

    it('keeps focus on the trigger when the pointer presses an option or the list padding', async () => {
      const { fixture, root } = mount(SELECT());
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      trigger.click();
      await settle(fixture);
      for (const target of [optionsOf()[0], listbox()!, popup()!]) {
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        target.dispatchEvent(event);
        expect(event.defaultPrevented, target.className).toBe(true);
      }
      await userEvent.pointer({ keys: '[MouseLeft>]', target: optionsOf()[1] });
      expect(document.activeElement).toBe(trigger);
      await userEvent.pointer({ keys: '[/MouseLeft]' });
    });

    it('does nothing when disabled', async () => {
      const { fixture, root } = mount(SELECT('disabled'));
      await settle(fixture);
      const trigger = triggerOf(root);
      expect(trigger.disabled).toBe(true);
      trigger.click();
      await settle(fixture);
      expect(popup()).toBeNull();
    });

    it('does not open inside a disabled fieldset, which disables the trigger too', async () => {
      const { fixture, root } = mount(`<fieldset disabled>${SELECT()}</fieldset>`);
      await settle(fixture);
      const trigger = triggerOf(root);
      expect(trigger.matches(':disabled')).toBe(true);
      trigger.click();
      press(trigger, 'ArrowDown');
      await settle(fixture);
      expect(popup()).toBeNull();
    });

    it('closes the list when it becomes disabled while open', async () => {
      const { fixture, root, host } = mount(
        `<ck-select aria-label="Target" [(value)]="value" [disabled]="locked()">${KINDS}</ck-select>`,
      );
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      host.locked.set(true);
      await settle(fixture);
      await wait(20);
      expect(popup()).toBeNull();
    });
  });

  describe('options', () => {
    it('keeps rich content in the list and reads the trigger text from it', async () => {
      const { fixture, root } = mount(
        `<ck-select aria-label="Workout" [(value)]="value">
          <ck-option value="a"><strong>Sweet Spot</strong> <small>60 min</small></ck-option>
          <ck-option value="b">Recovery <em>30 min</em></ck-option>
        </ck-select>`,
        (host) => host.value.set('a'),
      );
      await settle(fixture);
      expect(shownValue(root)).toBe('Sweet Spot 60 min');
      triggerOf(root).click();
      await settle(fixture);
      expect(optionsOf()[0].querySelector('strong')!.textContent).toBe('Sweet Spot');
      expect(optionsOf()[1].querySelector('em')).not.toBeNull();
    });

    it('draws the check mark on the selected option only, and updates it with the value', async () => {
      const { fixture, root, host } = mount(SELECT(), (host) => host.value.set('ftp'));
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      const checks = () =>
        optionsOf().map((option) => option.querySelector('.ck-option__check') !== null);
      expect(checks()).toEqual([true, false, false, false]);
      host.value.set('level');
      await settle(fixture);
      expect(checks()).toEqual([false, false, true, false]);
      expect(optionsOf()[2].getAttribute('aria-selected')).toBe('true');
    });

    it('has a generated id per option, replaceable and following a change', async () => {
      const { fixture, root, host } = mount(
        `<ck-select aria-label="Target" [(value)]="value">
          <ck-option value="a">A</ck-option>
          <ck-option value="b" id="mine">B</ck-option>
          <ck-option value="c" [id]="'opt-' + items()[0].label">C</ck-option>
        </ck-select>`,
      );
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      expect(optionsOf()[0].id).toMatch(/^ck-option-\d+$/);
      expect(optionsOf()[1].id).toBe('mine');
      expect(optionsOf()[2].id).toBe('opt-Alpha');
      host.items.set([{ value: 'a', label: 'Other' }]);
      await settle(fixture);
      expect(optionsOf()[2].id).toBe('opt-Other');
    });

    it('groups options with a labelled group', async () => {
      const { fixture, root } = mount(
        `<ck-select aria-label="Target" [(value)]="value">
          <ck-optgroup label="Power">
            <ck-option value="ftp">% FTP</ck-option>
            <ck-option value="watt">Watts</ck-option>
          </ck-optgroup>
          <ck-optgroup label="Other" disabled>
            <ck-option value="level">Level</ck-option>
            <ck-option value="free">Free</ck-option>
          </ck-optgroup>
        </ck-select>`,
      );
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      const groups = Array.from(document.querySelectorAll<HTMLElement>('ck-optgroup'));
      expect(groups.map((group) => group.getAttribute('role'))).toEqual(['group', 'group']);
      const names = groups.map(
        (group) => document.getElementById(group.getAttribute('aria-labelledby')!)!.textContent,
      );
      expect(names).toEqual(['Power', 'Other']);
      expect(optionsOf().map((option) => option.getAttribute('aria-disabled'))).toEqual([
        null,
        null,
        'true',
        'true',
      ]);
    });

    it('treats options in a disabled group as disabled for the keyboard and the mouse', async () => {
      const { fixture, root, host } = mount(
        `<ck-select aria-label="Target" [(value)]="value">
          <ck-optgroup label="Off" disabled><ck-option value="x">X</ck-option></ck-optgroup>
          <ck-optgroup label="On"><ck-option value="y">Y</ck-option></ck-optgroup>
        </ck-select>`,
      );
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      press(trigger, 'ArrowDown');
      await settle(fixture);
      expect(activeOption()!.textContent!.trim()).toBe('Y');
      optionsOf()[0].click();
      await settle(fixture);
      expect(host.value()).toBeNull();
    });

    it('throws for an option outside a select', () => {
      expect(() => mount('<ck-option value="x">X</ck-option>')).toThrow();
    });
  });

  describe('value', () => {
    it('shows the placeholder, warns once and keeps the value for a value no option has', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root, host } = mount(SELECT(), (host) => host.value.set('nope'));
      await settle(fixture);
      expect(shownValue(root)).toBe('Pick one');
      expect(host.value()).toBe('nope');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('matches no ck-option');
      host.value.set('still-nope');
      await settle(fixture);
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it('does not warn while there are no options yet, nor for null and undefined', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host } = mount(REPEATED, (host) => {
        host.items.set([]);
        host.value.set('b');
      });
      await settle(fixture);
      host.value.set(null);
      await settle(fixture);
      host.value.set(undefined);
      await settle(fixture);
      expect(warn.mock.calls.filter((call) => String(call[0]).includes('matches no'))).toEqual([]);
    });

    it('does not warn for a value whose options are created in the same render', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root } = mount(
        `<ck-select aria-label="Choice" [(value)]="value" [compareWith]="sameChoice">
          @for (choice of choices; track choice.id) { <ck-option [value]="choice">{{ choice.name }}</ck-option> }
        </ck-select>
        ${REPEATED}`,
        (host) => host.value.set({ id: 3, name: 'copy' }),
      );
      await settle(fixture);
      expect(shownValue(root)).toBe('Three');
      const warned = warn.mock.calls.filter((call) => String(call[0]).includes('matches no'));
      // The second select has the object as a value too: only that one may warn, once.
      expect(warned).toHaveLength(1);
    });

    it('selects the option that loads after the value', async () => {
      const { fixture, root, host } = mount(
        `<ck-select aria-label="Target" placeholder="Pick one" [(value)]="value">
          @for (item of items(); track item.value) { <ck-option [value]="item.value">{{ item.label }}</ck-option> }
        </ck-select>`,
        (host) => {
          host.items.set([]);
          host.value.set('b');
        },
      );
      await settle(fixture);
      expect(shownValue(root)).toBe('Pick one');
      host.items.set([{ value: 'b', label: 'Bravo' }]);
      await settle(fixture);
      expect(shownValue(root)).toBe('Bravo');
    });

    it('compares object values with compareWith', async () => {
      const { fixture, root, host } = mount(
        `<ck-select aria-label="Choice" [(value)]="value" [compareWith]="sameChoice">
          @for (choice of choices; track choice.id) { <ck-option [value]="choice">{{ choice.name }}</ck-option> }
        </ck-select>`,
        (host) => host.value.set({ id: 2, name: 'copy' }),
      );
      await settle(fixture);
      expect(shownValue(root)).toBe('Two');
      triggerOf(root).click();
      await settle(fixture);
      expect(optionsOf().map((option) => option.getAttribute('aria-selected'))).toEqual([
        'false',
        'true',
        'false',
      ]);
      optionsOf()[2].click();
      await settle(fixture);
      expect(host.value()).toBe(host.choices[2]);
      expect(shownValue(root)).toBe('Three');
    });

    it('does not match objects by content without compareWith', async () => {
      const { fixture, root } = mount(
        `<ck-select aria-label="Choice" placeholder="none" [(value)]="value">
          @for (choice of choices; track choice.id) { <ck-option [value]="choice">{{ choice.name }}</ck-option> }
        </ck-select>`,
        (host) => host.value.set({ id: 2, name: 'Two' }),
      );
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await settle(fixture);
      expect(shownValue(root)).toBe('none');
    });

    it('never hands null to compareWith', async () => {
      const compare = vi.fn(
        (first: { id: number }, second: { id: number }) => first.id === second.id,
      );
      const { fixture, root, host } = mount(
        `<ck-select aria-label="Choice" [(value)]="value" [compareWith]="sameChoice" placeholder="none">
          @for (choice of choices; track choice.id) { <ck-option [value]="choice">{{ choice.name }}</ck-option> }
        </ck-select>`,
        (host) => {
          (host as unknown as { sameChoice: unknown }).sameChoice = compare;
          host.value.set(null);
        },
      );
      await settle(fixture);
      expect(shownValue(root)).toBe('none');
      host.value.set(undefined);
      await settle(fixture);
      expect(compare).not.toHaveBeenCalled();
    });

    it('can select an option whose value is null', async () => {
      const { fixture, root, host } = mount(
        `<ck-select aria-label="Target" [(value)]="value">
          <ck-option [value]="null">Any</ck-option><ck-option value="a">A</ck-option>
        </ck-select>`,
        (host) => host.value.set('a'),
      );
      await settle(fixture);
      expect(shownValue(root)).toBe('A');
      triggerOf(root).click();
      await settle(fixture);
      optionsOf()[0].click();
      await settle(fixture);
      expect(host.value()).toBeNull();
      expect(shownValue(root)).toBe('Any');
    });

    it('changes the selection while open without moving the highlight', async () => {
      const { fixture, root, host } = mount(SELECT(), (host) => host.value.set('ftp'));
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      trigger.click();
      await settle(fixture);
      press(trigger, 'ArrowDown');
      host.value.set('level');
      await settle(fixture);
      expect(optionsOf()[2].getAttribute('aria-selected')).toBe('true');
      expect(optionsOf()[0].getAttribute('aria-selected')).toBe('false');
      expect(activeOption()).toBe(optionsOf()[1]);
    });
  });

  describe('options coming and going while open', () => {
    it('lists an added option at once and can move onto it', async () => {
      const { fixture, root, host } = mount(REPEATED);
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      press(trigger, 'ArrowDown');
      await settle(fixture);
      host.items.update((items) => [...items, { value: 'd', label: 'Delta' }]);
      await settle(fixture);
      expect(labelsOf()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
      press(trigger, 'End');
      await settle(fixture);
      expect(activeOption()!.textContent!.trim()).toBe('Delta');
    });

    it('highlights the first option again when the highlighted one is removed', async () => {
      const { fixture, root, host } = mount(REPEATED);
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      press(trigger, 'ArrowDown');
      press(trigger, 'ArrowDown');
      await settle(fixture);
      expect(activeOption()!.textContent!.trim()).toBe('Bravo');
      host.items.update((items) => items.filter((item) => item.value !== 'b'));
      await settle(fixture);
      expect(labelsOf()).toEqual(['Alpha', 'Charlie']);
      expect(activeOption()!.textContent!.trim()).toBe('Alpha');
      expect(trigger.getAttribute('aria-activedescendant')).toBe(activeOption()!.id);
    });

    it('skips an option that becomes disabled and survives an emptied list', async () => {
      const { fixture, root, host } = mount(REPEATED);
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      press(trigger, 'ArrowDown');
      await settle(fixture);
      host.items.set([
        { value: 'a', label: 'Alpha', disabled: true },
        { value: 'b', label: 'Bravo' },
      ]);
      await settle(fixture);
      expect(activeOption()!.textContent!.trim()).toBe('Bravo');
      host.items.set([]);
      await settle(fixture);
      expect(activeOption()).toBeNull();
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
      press(trigger, 'ArrowDown');
      press(trigger, 'Enter');
      await settle(fixture);
      expect(host.value()).toBeNull();
    });
  });

  describe('closing', () => {
    it('closes on Escape and an outside press without a change, keeping focus on the trigger', async () => {
      const { fixture, root, host } = mount(
        `${SELECT()}<button type="button" id="elsewhere">Elsewhere</button>`,
        (host) => host.value.set('ftp'),
      );
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      press(trigger, 'ArrowDown');
      press(trigger, 'ArrowDown');
      await settle(fixture);
      press(trigger, 'Escape');
      await settle(fixture);
      expect(popup()).toBeNull();
      expect(host.value()).toBe('ftp');
      expect(document.activeElement).toBe(trigger);
      trigger.click();
      await settle(fixture);
      const other = root.querySelector<HTMLElement>('#elsewhere')!;
      other.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      await settle(fixture);
      expect(popup()).toBeNull();
      expect(host.value()).toBe('ftp');
    });

    it('closes on a document Escape while focus is elsewhere', async () => {
      const { fixture, root } = mount(SELECT());
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle(fixture);
      expect(popup()).toBeNull();
    });

    it('closes without a change when focus moves to another element', async () => {
      const { fixture, root, host } = mount(
        `${SELECT()}<button type="button" id="elsewhere">Elsewhere</button>`,
      );
      await settle(fixture);
      triggerOf(root).focus();
      triggerOf(root).click();
      await settle(fixture);
      root.querySelector<HTMLElement>('#elsewhere')!.focus();
      await settle(fixture);
      expect(popup()).toBeNull();
      expect(host.value()).toBeNull();
    });

    it('closes when the anchor is hidden', async () => {
      const { fixture, root } = mount(`<div id="gone">${SELECT()}</div>`);
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      root.querySelector<HTMLElement>('#gone')!.style.display = 'none';
      await wait(100);
      await settle(fixture);
      expect(popup()).toBeNull();
    });

    it('leaves no overlay or inert behind when destroyed while open', async () => {
      const { fixture, root } = mount(SELECT());
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      expect(overlayPanels().length).toBe(1);
      fixture.destroy();
      await wait(50);
      expect(overlayPanels()).toEqual([]);
      expect(document.querySelector('[inert]')).toBeNull();
    });

    it('can open and close again quickly without leaving two lists', async () => {
      const { fixture, root } = mount(SELECT());
      await settle(fixture);
      const trigger = triggerOf(root);
      for (let round = 0; round < 4; round++) {
        trigger.click();
        trigger.click();
      }
      trigger.click();
      await settle(fixture);
      await wait(30);
      expect(document.querySelectorAll('.ck-select-popup').length).toBe(1);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('server', () => {
    it('renders the closed trigger with the selected text and opens nothing', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const { fixture, root } = mount(SELECT(), (host) => host.value.set('watt'));
      await settle(fixture);
      expect(shownValue(root)).toBe('Watts');
      expect(triggerOf(root).getAttribute('aria-expanded')).toBe('false');
      triggerOf(root).click();
      await settle(fixture);
      expect(overlayPanels()).toEqual([]);
      expect(popup()).toBeNull();
    });
  });

  describe('sheet', () => {
    it('opens a dialog sheet named and titled with the select name', async () => {
      fakeMedia(true);
      const { fixture, root } = mount(SELECT());
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      const panel = document.querySelector<HTMLElement>('.ck-overlay--sheet')!;
      expect(panel.getAttribute('role')).toBe('dialog');
      expect(panel.getAttribute('aria-modal')).toBe('true');
      expect(panel.getAttribute('aria-label')).toBe('Target');
      expect(panel.querySelector('.ck-select-popup__title')!.textContent!.trim()).toBe('Target');
      expect(labelsOf()).toEqual(['% FTP', 'Watts', 'Level', 'Free']);
    });

    it('moves focus into the list, picks on tap, closes and returns focus to the trigger', async () => {
      fakeMedia(true);
      const { fixture, root, host } = mount(SELECT(), (host) => host.value.set('watt'));
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      trigger.click();
      await settle(fixture);
      expect(document.activeElement).toBe(listbox());
      expect(listbox()!.getAttribute('aria-activedescendant')).toBe(optionsOf()[1].id);
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);
      optionsOf()[2].click();
      await settle(fixture);
      await wait(20);
      expect(host.value()).toBe('level');
      expect(overlayPanels()).toEqual([]);
      expect(document.activeElement).toBe(trigger);
    });

    it('has no title when the select has no name, and warns', async () => {
      fakeMedia(true);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root } = mount(`<ck-select [(value)]="value">${KINDS}</ck-select>`);
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      expect(document.querySelector('.ck-select-popup__title')).toBeNull();
      expect(warn).toHaveBeenCalled();
    });
  });

  describe('dev warnings', () => {
    it('warns once about a select without an accessible name', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture } = mount(`<ck-select placeholder="x">${KINDS}</ck-select>`);
      await settle(fixture);
      const names = warn.mock.calls.filter((call) => String(call[0]).includes('accessible name'));
      expect(names).toHaveLength(1);
    });

    it('does not warn when a label names it', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture } = mount(
        `<label>Target <ck-select [(value)]="value">${KINDS}</ck-select></label>`,
      );
      await settle(fixture);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
