import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import {
  DARK_TOKENS,
  RadioHost,
  checkedOf,
  inputOf,
  inputs,
  mount,
  query,
  settle,
} from '../testing/radio-host';

const OPTIONS = `<ck-radio option="kg">Kilograms</ck-radio>
  <ck-radio option="lb">Pounds</ck-radio>
  <ck-radio option="st">Stone</ck-radio>`;

const GROUP = (attributes = '', content = OPTIONS) =>
  `<ck-radio-group ${attributes} [(value)]="unit"><label>Weight unit</label>${content}</ck-radio-group>`;

const EMITTING = (attributes = '', content = OPTIONS) =>
  `<ck-radio-group ${attributes} [value]="unit()" (valueChange)="emitted.push($event)"><label>Weight unit</label>${content}</ck-radio-group>`;

const UNITS = `<ck-radio-group [formControl]="unitControl" required>
  <label>Weight unit</label>${OPTIONS}
  <ck-hint>Used for every lift.</ck-hint>
  <ck-error>Pick a unit.</ck-error>
</ck-radio-group><button id="after">After</button>`;

const groupOf = (root: HTMLElement) => query(root, 'ck-radio-group');
const errorOf = (root: HTMLElement) => query(root, 'ck-error');

describe('CkRadioGroup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
  });

  describe('structure and name', () => {
    it('is a radiogroup named by its first label, with an id of its own on the label', async () => {
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      const label = query(root, 'ck-radio-group > label');
      expect(groupOf(root).getAttribute('role')).toBe('radiogroup');
      expect(label.id).toMatch(/^ck-radio-group-label-\d+$/);
      expect(groupOf(root).getAttribute('aria-labelledby')).toBe(label.id);
      expect(label.classList.contains('ck-radio-group__label')).toBe(true);
    });

    it('keeps the id a consumer gave the label, static or bound, and the ids of group and radios', async () => {
      const { fixture, host, root } = mount(
        `<ck-radio-group id="group-id" [(value)]="unit"><label [id]="hintId()">Unit</label>
          <ck-radio id="radio-static" option="kg">Kg</ck-radio>
          <ck-radio [id]="hintId() + '-radio'" option="lb">Lb</ck-radio></ck-radio-group>`,
      );
      await settle(fixture);
      expect(groupOf(root).id).toBe('group-id');
      expect(groupOf(root).getAttribute('aria-labelledby')).toBe('hint-a');
      expect(query(root, '#radio-static')).not.toBeNull();
      expect(query(root, '#hint-a-radio')).not.toBeNull();
      host.hintId.set('hint-b');
      await settle(fixture);
      expect(query(root, 'label').id).toBe('hint-b');
      expect(groupOf(root).getAttribute('aria-labelledby')).toBe('hint-b');
      expect(query(root, '#hint-b-radio')).not.toBeNull();
      expect(groupOf(root).id).toBe('group-id');
    });

    it('lets aria-label and aria-labelledby inputs name the group, and removes them from the host markup', async () => {
      const labelled = mount(
        GROUP('aria-label="Weight unit"').replace('<label>Weight unit</label>', ''),
      );
      await settle(labelled.fixture);
      expect(groupOf(labelled.root).getAttribute('aria-label')).toBe('Weight unit');
      expect(groupOf(labelled.root).hasAttribute('aria-labelledby')).toBe(false);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const outside = mount(`<h3 id="outside">Outside</h3>${GROUP('aria-labelledby="outside"')}`);
      await settle(outside.fixture);
      expect(groupOf(outside.root).getAttribute('aria-labelledby')).toBe('outside');
    });

    it('draws a required marker on the label and aria-required, and removes both again', async () => {
      const { fixture, host, root } = mount(
        `<ck-radio-group [(value)]="unit" [required]="locked()"><label>Unit</label>${OPTIONS}</ck-radio-group>`,
      );
      host.locked.set(true);
      await settle(fixture);
      const label = query(root, 'label');
      expect(label.querySelectorAll('.ck-radio-group__required')).toHaveLength(1);
      expect(label.classList.contains('ck-radio-group__label--required')).toBe(true);
      expect(groupOf(root).getAttribute('aria-required')).toBe('true');
      host.locked.set(false);
      await settle(fixture);
      expect(label.querySelectorAll('.ck-radio-group__required')).toHaveLength(0);
      expect(groupOf(root).hasAttribute('aria-required')).toBe(false);
    });

    it('is not required by default and sets no aria-required', async () => {
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      expect(groupOf(root).hasAttribute('aria-required')).toBe(false);
    });

    it('puts the label above the list and the hint below it', async () => {
      const { fixture, root } = mount(GROUP('', `${OPTIONS}<ck-hint>Pick one.</ck-hint>`));
      await settle(fixture);
      const label = query(root, 'label').getBoundingClientRect();
      const first = inputs(root)[0].getBoundingClientRect();
      const last = inputs(root)[2].getBoundingClientRect();
      const hint = query(root, '.ck-radio-group__messages ck-hint').getBoundingClientRect();
      expect(label.bottom).toBeLessThanOrEqual(first.top);
      expect(hint.top).toBeGreaterThanOrEqual(last.bottom);
    });

    it('gives every radio of one group the same name, and each group its own', async () => {
      const { fixture, root } = mount(`${GROUP()}${GROUP()}`);
      await settle(fixture);
      const names = inputs(root).map((input) => input.name);
      expect(names[0]).toMatch(/^ck-radio-group-\d+$/);
      expect(new Set(names.slice(0, 3)).size).toBe(1);
      expect(new Set(names.slice(3)).size).toBe(1);
      expect(names[0]).not.toBe(names[3]);
    });

    it('uses the name input, follows a change of it, and falls back when it is empty', async () => {
      const { fixture, host, root } = mount(
        `<ck-radio-group [name]="groupName()" [(value)]="unit"><label>Unit</label>${OPTIONS}</ck-radio-group>`,
      );
      await settle(fixture);
      expect(inputs(root).every((input) => input.name === 'unit')).toBe(true);
      host.groupName.set('');
      await settle(fixture);
      expect(inputs(root)[0].name).toMatch(/^ck-radio-group-\d+$/);
    });

    it('posts the checked option under the name in a native form', async () => {
      const { fixture, root } = mount(`<form>${GROUP('name="unit"')}</form>`, (instance) =>
        instance.unit.set('lb'),
      );
      await settle(fixture);
      const data = new FormData(query<HTMLFormElement>(root, 'form'));
      expect(data.get('unit')).toBe('lb');
      inputOf(root, 2).click();
      await settle(fixture);
      expect(new FormData(query<HTMLFormElement>(root, 'form')).get('unit')).toBe('st');
    });

    it('keeps two groups independent: a click in one does not uncheck the other', async () => {
      const { fixture, root } = mount(
        `<ck-radio-group aria-label="A" value="kg">${OPTIONS}</ck-radio-group>
         <ck-radio-group aria-label="B" value="st">${OPTIONS}</ck-radio-group>`,
      );
      await settle(fixture);
      inputOf(root, 4).click();
      await settle(fixture);
      expect(checkedOf(root)).toEqual([true, false, false, false, true, false]);
    });
  });

  describe('the value', () => {
    it('checks the radio of the option in the value, and none for null or undefined', async () => {
      const { fixture, host, root } = mount(GROUP());
      host.unit.set('lb');
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false]);
      for (const odd of [null, undefined]) {
        host.unit.set(odd);
        await settle(fixture);
        expect(checkedOf(root)).toEqual([false, false, false]);
      }
    });

    it('is nothing checked by default and works two-way', async () => {
      const { fixture, host, root } = mount(`${GROUP()}<output>{{ unit() }}</output>`);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false]);
      inputOf(root, 1).click();
      await settle(fixture);
      expect(query(root, 'output').textContent).toBe('lb');
      expect(host.unit()).toBe('lb');
    });

    it('emits for each user change and nothing for a programmatic write', async () => {
      const { fixture, host, root } = mount(EMITTING());
      await settle(fixture);
      host.unit.set('lb');
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      inputOf(root, 2).click();
      await settle(fixture);
      expect(host.emitted).toEqual(['st']);
      expect(checkedOf(root)).toEqual([false, false, true]);
    });

    it('emits nothing for a click on the radio that is already checked', async () => {
      const { fixture, host, root } = mount(EMITTING());
      host.unit.set('kg');
      await settle(fixture);
      await userEvent.click(query(root, '.ck-radio__label'));
      await userEvent.click(query(root, '.ck-radio__label'));
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(checkedOf(root)).toEqual([true, false, false]);
    });

    it('reports a burst of fast clicks in order, once per change', async () => {
      const { fixture, host, root } = mount(EMITTING());
      await settle(fixture);
      for (const index of [2, 0, 0, 1, 2, 2, 1]) {
        inputOf(root, index).click();
      }
      await settle(fixture);
      expect(host.emitted).toEqual(['st', 'kg', 'lb', 'st', 'lb']);
      expect(checkedOf(root)).toEqual([false, true, false]);
    });

    it('selects with a real click on the text, the circle and the hint, once each', async () => {
      const { fixture, host, root } = mount(
        EMITTING(
          '',
          `<ck-radio option="kg">Kilograms</ck-radio>
           <ck-radio option="lb">Pounds <ck-hint>Imperial</ck-hint></ck-radio>
           <ck-radio option="st">Stone</ck-radio>`,
        ),
      );
      await settle(fixture);
      await userEvent.click(query(root, 'ck-radio:nth-of-type(1) .ck-radio__label'));
      await userEvent.click(query(root, 'ck-hint'));
      await userEvent.click(query(root, 'ck-radio:nth-of-type(3) .ck-radio__control'));
      await settle(fixture);
      expect(host.emitted).toEqual(['kg', 'lb', 'st']);
    });

    it('compares options with Object.is by default: objects by identity, NaN equal to itself', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host, root } = mount(
        `<ck-radio-group [(value)]="unit" aria-label="Pick">
          @for (item of objectOptions; track item.id) {<ck-radio [option]="item">{{ item.id }}</ck-radio>}
          <ck-radio [option]="nan">NaN</ck-radio></ck-radio-group>`,
        (instance) => Object.assign(instance, { nan: Number.NaN }),
      );
      host.unit.set(host.objectOptions[1]);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false, false]);
      host.unit.set(Number.NaN);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false, true]);
      host.unit.set({ id: 1 });
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false, false]);
      expect(warn).toHaveBeenCalledTimes(1);
      inputOf(root, 0).click();
      await settle(fixture);
      expect(host.unit()).toBe(host.objectOptions[0]);
    });

    it('matches with compareWith, and emits the radio option itself', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host, root } = mount(
        `<ck-radio-group [(value)]="unit" [compareWith]="sameId" aria-label="Pick">
          @for (item of objectOptions; track item.id) {<ck-radio [option]="item">{{ item.id }}</ck-radio>}
        </ck-radio-group>`,
      );
      host.unit.set({ id: 2 });
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false]);
      inputOf(root, 2).click();
      await settle(fixture);
      expect(host.unit()).toBe(host.objectOptions[2]);
      expect(checkedOf(root)).toEqual([false, false, true]);
      expect(warn).not.toHaveBeenCalled();
    });

    it('never hands null to compareWith', async () => {
      const compare = vi.fn((option: string, value: string) => option === value);
      const { fixture, host } = mount(
        `<ck-radio-group [(value)]="unit" [compareWith]="compare" aria-label="Pick">${OPTIONS}</ck-radio-group>`,
        (instance) => Object.assign(instance, { compare }),
      );
      await settle(fixture);
      host.unit.set(null);
      await settle(fixture);
      expect(compare).not.toHaveBeenCalled();
    });

    it('supports the options 0, empty string and false, and can never check null or undefined', async () => {
      const { fixture, host, root } = mount(
        EMITTING(
          '',
          `<ck-radio [option]="0">Zero</ck-radio>
           <ck-radio [option]="''">Empty</ck-radio>
           <ck-radio [option]="false">False</ck-radio>
           <ck-radio [option]="null">Null</ck-radio>
           <ck-radio [option]="undefined">Undefined</ck-radio>`,
        ),
      );
      await settle(fixture);
      for (const [index, expected] of [
        [0, 0],
        [1, ''],
        [2, false],
      ] as const) {
        inputOf(root, index).click();
        await settle(fixture);
        expect(host.emitted.at(-1)).toBe(expected);
        expect(checkedOf(root).filter(Boolean)).toHaveLength(1);
        expect(inputOf(root, index).checked).toBe(true);
      }
      const before = host.emitted.length;
      inputOf(root, 3).click();
      inputOf(root, 4).click();
      await settle(fixture);
      expect(host.emitted).toHaveLength(before + 2);
      expect(host.emitted.slice(-2)).toEqual([null, undefined]);
      expect(checkedOf(root)).toEqual([false, false, false, false, false]);
    });

    it('follows radios that are added, removed and reordered', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host, root } = mount(
        GROUP(
          '',
          `@for (name of options(); track name) {<ck-radio [option]="name">{{ name }}</ck-radio>}`,
        ),
      );
      host.unit.set('lb');
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false]);
      host.options.set(['st', 'lb', 'kg', 'oz']);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false, false]);
      inputOf(root, 3).click();
      await settle(fixture);
      expect(host.unit()).toBe('oz');
      host.options.set(['kg']);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false]);
      expect(host.unit()).toBe('oz');
    });

    it('puts the native state back when a change arrives while the group is disabled', async () => {
      const { fixture, host, root } = mount(EMITTING('[disabled]="locked()"'));
      host.unit.set('kg');
      await settle(fixture);
      host.locked.set(true);
      await settle(fixture);
      const target = inputOf(root, 1);
      target.checked = true;
      target.dispatchEvent(new Event('change', { bubbles: true }));
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(checkedOf(root)).toEqual([true, false, false]);
    });
  });

  describe('resync', () => {
    it('puts the native state back when a form subscriber sets the old value again, synchronously', async () => {
      const { fixture, host, root } = mount(UNITS);
      host.unitControl.setValue('kg');
      await settle(fixture);
      host.unitControl.valueChanges.subscribe((value) => {
        if (value === 'lb') {
          host.unitControl.setValue('kg');
        }
      });
      inputOf(root, 1).click();
      expect(checkedOf(root)).toEqual([true, false, false]);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([true, false, false]);
      expect(host.unitControl.value).toBe('kg');
    });
  });

  describe('native keyboard', () => {
    const ROW = `<button id="before">Before</button>${GROUP()}<button id="after">After</button>`;
    const focusBefore = (root: HTMLElement) => query(root, '#before').focus();

    it('enters at the checked radio with Tab, and leaves with the next Tab', async () => {
      const { fixture, host, root } = mount(ROW);
      host.unit.set('lb');
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      expect(document.activeElement).toBe(inputOf(root, 1));
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#after'));
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(inputOf(root, 1));
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(query(root, '#before'));
    });

    it('enters at the first enabled radio when none is checked, and the group is one tab stop', async () => {
      const { fixture, root } = mount(
        `<button id="before">Before</button>${GROUP(
          '',
          `<ck-radio option="kg" disabled>Kilograms</ck-radio>
           <ck-radio option="lb">Pounds</ck-radio>
           <ck-radio option="st">Stone</ck-radio>`,
        )}<button id="after">After</button>`,
      );
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      expect(document.activeElement).toBe(inputOf(root, 1));
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#after'));
    });

    it('moves and checks with ArrowDown and ArrowRight, and wraps at the end', async () => {
      const { fixture, host, root } = mount(ROW);
      host.unit.set('kg');
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      await userEvent.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(inputOf(root, 1));
      expect(host.unit()).toBe('lb');
      await userEvent.keyboard('{ArrowRight}');
      expect(host.unit()).toBe('st');
      await userEvent.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(inputOf(root, 0));
      expect(host.unit()).toBe('kg');
      expect(checkedOf(root)).toEqual([true, false, false]);
    });

    it('moves and checks with ArrowUp and ArrowLeft, and wraps at the start', async () => {
      const { fixture, host, root } = mount(ROW);
      host.unit.set('lb');
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      await userEvent.keyboard('{ArrowUp}');
      expect(host.unit()).toBe('kg');
      await userEvent.keyboard('{ArrowLeft}');
      expect(document.activeElement).toBe(inputOf(root, 2));
      expect(host.unit()).toBe('st');
    });

    it('skips disabled radios and wraps over them', async () => {
      const { fixture, host, root } = mount(
        `<button id="before">Before</button>${GROUP(
          '',
          `<ck-radio option="kg">Kilograms</ck-radio>
           <ck-radio option="lb" disabled>Pounds</ck-radio>
           <ck-radio option="st">Stone</ck-radio>
           <ck-radio option="oz" disabled>Ounces</ck-radio>`,
        )}`,
      );
      host.unit.set('kg');
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      await userEvent.keyboard('{ArrowDown}');
      expect(host.unit()).toBe('st');
      await userEvent.keyboard('{ArrowDown}');
      expect(host.unit()).toBe('kg');
      await userEvent.keyboard('{ArrowUp}');
      expect(host.unit()).toBe('st');
    });

    it('checks the focused radio with Space and does nothing on Enter', async () => {
      const { fixture, host, root } = mount(ROW);
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      expect(document.activeElement).toBe(inputOf(root, 0));
      await userEvent.keyboard('{Enter}');
      expect(host.unit()).toBeNull();
      await userEvent.keyboard(' ');
      expect(host.unit()).toBe('kg');
      await userEvent.keyboard(' ');
      expect(host.unit()).toBe('kg');
    });

    it('checks the first arrow target when nothing was checked', async () => {
      const { fixture, host, root } = mount(ROW);
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      await userEvent.keyboard('{ArrowDown}');
      expect(host.unit()).toBe('lb');
      expect(checkedOf(root)).toEqual([false, true, false]);
    });

    it('keeps the arrows working in right-to-left text', async () => {
      const { fixture, host, root } = mount(ROW);
      document.body.dir = 'rtl';
      host.unit.set('kg');
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      await userEvent.keyboard('{ArrowDown}');
      expect(host.unit()).toBe('lb');
      await userEvent.keyboard('{ArrowUp}');
      expect(host.unit()).toBe('kg');
    });

    it('swaps ArrowLeft and ArrowRight in right-to-left text: Left is next, Right is previous', async () => {
      const { fixture, host, root } = mount(ROW);
      document.body.dir = 'rtl';
      host.unit.set('kg');
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      await userEvent.keyboard('{ArrowLeft}');
      expect(host.unit()).toBe('lb');
      await userEvent.keyboard('{ArrowLeft}');
      expect(host.unit()).toBe('st');
      await userEvent.keyboard('{ArrowRight}');
      expect(host.unit()).toBe('lb');
    });

    it('does not move on the arrows when the group is disabled while a radio has focus', async () => {
      const { fixture, host, root } = mount(
        `<button id="before">Before</button>${GROUP('[disabled]="locked()"')}<button id="after">After</button>`,
      );
      host.unit.set('kg');
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      expect(document.activeElement).toBe(inputOf(root, 0));
      host.locked.set(true);
      await settle(fixture);
      await userEvent.keyboard('{ArrowDown}');
      expect(host.unit()).toBe('kg');
      expect(checkedOf(root)).toEqual([true, false, false]);
    });

    it('does not enter a disabled group with Tab', async () => {
      const { fixture, root } = mount(
        `<button id="before">Before</button>${GROUP('disabled')}<button id="after">After</button>`,
      );
      await settle(fixture);
      focusBefore(root);
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#after'));
    });
  });

  describe('description and errors', () => {
    const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

    it('is not touched, and shows no error, while a press lands on the text of another radio', async () => {
      const { fixture, host, root } = mount(UNITS);
      await settle(fixture);
      inputOf(root, 0).focus();
      await userEvent.click(query(root, 'ck-radio:nth-of-type(3) .ck-radio__label'));
      await pause();
      await settle(fixture);
      expect(host.unitControl.touched).toBe(false);
      expect(errorOf(root).hidden).toBe(true);
      await userEvent.click(query(root, 'ck-radio:nth-of-type(2) .ck-radio__label'));
      await pause();
      await settle(fixture);
      expect(host.unitControl.touched).toBe(false);
      await userEvent.click(query(root, '#after'));
      await pause();
      await settle(fixture);
      expect(host.unitControl.touched).toBe(true);
      expect(errorOf(root).hidden).toBe(host.unitControl.valid);
    });

    it('is touched when a press lands on the page outside the group, where nothing takes focus', async () => {
      const { fixture, host, root } = mount(`${UNITS}<p id="plain">Plain text</p>`);
      await settle(fixture);
      inputOf(root, 0).focus();
      await userEvent.click(query(root, '#plain'));
      await pause();
      await settle(fixture);
      expect(host.unitControl.touched).toBe(true);
    });

    it('lists the group hints in aria-describedby and not the hints of its radios', async () => {
      const { fixture, root } = mount(
        GROUP(
          '',
          `<ck-radio option="a">A <ck-hint>About A</ck-hint></ck-radio>
           <ck-hint>Pick one.</ck-hint>`,
        ),
      );
      await settle(fixture);
      const [own, groupHint] = Array.from(root.querySelectorAll('ck-hint'));
      expect(groupOf(root).getAttribute('aria-describedby')).toBe(groupHint.id);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe(own.id);
      expect(query(root, '.ck-radio__label').textContent).toBe('A ');
    });

    it('follows a hint that appears, changes its id and disappears, and adds a consumer id last', async () => {
      const { fixture, host, root } = mount(
        GROUP(
          'aria-describedby="mine"',
          `${OPTIONS}@if (hint()) {<ck-hint [id]="hintId()">{{ hint() }}</ck-hint>}`,
        ),
      );
      await settle(fixture);
      expect(groupOf(root).getAttribute('aria-describedby')).toBe('hint-a mine');
      host.hintId.set('hint-b');
      await settle(fixture);
      expect(groupOf(root).getAttribute('aria-describedby')).toBe('hint-b mine');
      host.hint.set(null);
      await settle(fixture);
      expect(groupOf(root).getAttribute('aria-describedby')).toBe('mine');
    });

    it('keeps a static hint id and follows a bound and a changing id of a radio hint', async () => {
      const { fixture, host, root } = mount(
        GROUP(
          '',
          `<ck-radio option="a">A <ck-hint id="fixed">Static</ck-hint></ck-radio>
           <ck-radio option="b">B @if (hint()) {<ck-hint [id]="hintId()">Bound</ck-hint>}</ck-radio>`,
        ),
      );
      await settle(fixture);
      expect(inputOf(root, 0).getAttribute('aria-describedby')).toBe('fixed');
      expect(inputOf(root, 1).getAttribute('aria-describedby')).toBe('hint-a');
      host.hintId.set('hint-b');
      await settle(fixture);
      expect(inputOf(root, 1).getAttribute('aria-describedby')).toBe('hint-b');
      host.hint.set(null);
      await settle(fixture);
      expect(inputOf(root, 1).hasAttribute('aria-describedby')).toBe(false);
    });

    it('hides the error while untouched, and the radios are not invalid', async () => {
      const { fixture, root } = mount(UNITS);
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      expect(inputs(root).every((input) => !input.hasAttribute('aria-invalid'))).toBe(true);
      expect(groupOf(root).getAttribute('aria-describedby')).toBe(query(root, 'ck-hint').id);
    });

    it('does not touch the group while focus moves between its radios', async () => {
      const { fixture, host, root } = mount(UNITS);
      await settle(fixture);
      inputOf(root, 0).focus();
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(inputOf(root, 2));
      await settle(fixture);
      expect(host.unitControl.touched).toBe(false);
      expect(errorOf(root).hidden).toBe(true);
    });

    it('is touched, and shows the error, when focus leaves the whole group', async () => {
      const { fixture, host, root } = mount(UNITS);
      await settle(fixture);
      inputOf(root, 0).focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#after'));
      await settle(fixture);
      expect(host.unitControl.touched).toBe(true);
      expect(errorOf(root).hidden).toBe(false);
      for (const input of inputs(root)) {
        expect(input.getAttribute('aria-invalid')).toBe('true');
      }
      expect(groupOf(root).hasAttribute('aria-invalid')).toBe(false);
      expect(groupOf(root).getAttribute('aria-describedby')).toBe(
        `${query(root, 'ck-hint').id} ${errorOf(root).id}`,
      );
    });

    it('hides the error again when a radio is checked', async () => {
      const { fixture, root } = mount(UNITS);
      await settle(fixture);
      inputOf(root, 0).focus();
      query(root, '#after').focus();
      await settle(fixture);
      inputOf(root, 1).click();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      expect(inputs(root).every((input) => !input.hasAttribute('aria-invalid'))).toBe(true);
      expect(groupOf(root).getAttribute('aria-describedby')).toBe(query(root, 'ck-hint').id);
    });

    it('shows the error on submit without any touch', async () => {
      const { fixture, root } = mount(
        `<form [formGroup]="formGroup"><ck-radio-group formControlName="unit"><label>Unit</label>${OPTIONS}
          <ck-error>Pick one.</ck-error></ck-radio-group></form>`,
      );
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      query(root, 'form').dispatchEvent(new Event('submit'));
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
      expect(inputs(root).every((input) => input.getAttribute('aria-invalid') === 'true')).toBe(
        true,
      );
    });

    it('does not show an error for a group that is valid and touched', async () => {
      const { fixture, host, root } = mount(UNITS);
      host.unitControl.setValue('kg');
      await settle(fixture);
      inputOf(root, 0).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
    });

    it('keeps the id of a static, bound and changing error', async () => {
      const { fixture, host, root } = mount(
        `<ck-radio-group [formControl]="unitControl" aria-label="Unit">${OPTIONS}
          <ck-error [id]="hintId()">Pick one.</ck-error></ck-radio-group><button id="after">After</button>`,
      );
      await settle(fixture);
      inputOf(root, 0).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(groupOf(root).getAttribute('aria-describedby')).toBe('hint-a');
      host.hintId.set('hint-b');
      await settle(fixture);
      expect(groupOf(root).getAttribute('aria-describedby')).toBe('hint-b');
    });

    it('works with Signal Forms: touched on leaving the group, invalid until one is picked', async () => {
      const { fixture, host, root } = mount(
        `<ck-radio-group [formField]="signalForm.unit"><label>Unit</label>${OPTIONS}
          <ck-error>Pick one.</ck-error></ck-radio-group><button id="after">After</button>`,
      );
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      inputOf(root, 0).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(host.signalForm.unit().touched()).toBe(true);
      expect(errorOf(root).hidden).toBe(false);
      inputOf(root, 2).click();
      await settle(fixture);
      expect(host.signalModel().unit).toBe('st');
      expect(errorOf(root).hidden).toBe(true);
    });
  });

  describe('disabled and size', () => {
    it('disables every radio with the group, also from the forms API', async () => {
      const { fixture, host, root } = mount(EMITTING('[disabled]="locked()"'));
      await settle(fixture);
      host.locked.set(true);
      await settle(fixture);
      expect(inputs(root).every((input) => input.disabled)).toBe(true);
      expect(groupOf(root).classList.contains('ck-radio-group--disabled')).toBe(true);
      inputOf(root, 0).click();
      query(root, '.ck-radio__label').click();
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      host.locked.set(false);
      await settle(fixture);
      inputOf(root, 0).click();
      expect(host.emitted).toEqual(['kg']);
    });

    it('disables the radios when the form control is disabled', async () => {
      const { fixture, host, root } = mount(UNITS);
      host.unitControl.disable();
      await settle(fixture);
      expect(inputs(root).every((input) => input.disabled)).toBe(true);
      host.unitControl.enable();
      await settle(fixture);
      expect(inputs(root).every((input) => !input.disabled)).toBe(true);
    });

    it('disables a Signal Forms field', async () => {
      const { fixture, host, root } = mount(
        `<ck-radio-group [formField]="signalForm.unit"><label>Unit</label>${OPTIONS}</ck-radio-group>`,
      );
      host.locked.set(true);
      await settle(fixture);
      expect(inputs(root).every((input) => input.disabled)).toBe(true);
    });

    it('keeps a single radio disabled on its own, and takes the change back and forth', async () => {
      const { fixture, host, root } = mount(
        EMITTING(
          '',
          '<ck-radio option="a" [disabled]="locked()">A</ck-radio><ck-radio option="b">B</ck-radio>',
        ),
      );
      host.locked.set(true);
      await settle(fixture);
      expect(inputs(root).map((input) => input.disabled)).toEqual([true, false]);
      query(root, '.ck-radio__label').click();
      expect(host.emitted).toEqual([]);
      host.locked.set(false);
      await settle(fixture);
      await userEvent.click(query(root, '.ck-radio__label'));
      expect(host.emitted).toEqual(['a']);
    });

    it('keeps a disabled radio checked when it is the value', async () => {
      const { fixture, host, root } = mount(
        GROUP('', '<ck-radio option="a" disabled>A</ck-radio><ck-radio option="b">B</ck-radio>'),
      );
      host.unit.set('a');
      await settle(fixture);
      expect(checkedOf(root)).toEqual([true, false]);
      await userEvent.click(query(root, 'ck-radio:nth-of-type(2) .ck-radio__label'));
      await settle(fixture);
      expect(host.unit()).toBe('b');
    });

    it('is blocked inside a disabled fieldset', async () => {
      const { fixture, host, root } = mount(`<fieldset disabled>${EMITTING()}</fieldset>`);
      await settle(fixture);
      inputOf(root, 0).click();
      query(root, '.ck-radio__label').click();
      await settle(fixture);
      expect(host.emitted).toEqual([]);
    });

    it('gives the radios the size of the group', async () => {
      const { fixture, host, root } = mount(GROUP('[size]="size()"'));
      host.size.set('lg');
      await settle(fixture);
      for (const row of root.querySelectorAll('.ck-radio')) {
        expect(row.classList.contains('ck-radio--lg')).toBe(true);
      }
      expect(groupOf(root).classList.contains('ck-radio-group--lg')).toBe(true);
      host.size.set('sm');
      await settle(fixture);
      expect(query(root, '.ck-radio').classList.contains('ck-radio--sm')).toBe(true);
      expect(query(root, '.ck-radio').classList.contains('ck-radio--lg')).toBe(false);
    });

    it('uses the size from provideCkui when none is set', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'xl' })] });
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      expect(query(root, '.ck-radio').classList.contains('ck-radio--xl')).toBe(true);
      expect(groupOf(root).classList.contains('ck-radio-group--xl')).toBe(true);
    });

    it('lays the radios in a row with inline, and back into a column', async () => {
      const { fixture, host, root } = mount(GROUP('[inline]="locked()"'));
      host.locked.set(true);
      await settle(fixture);
      expect(groupOf(root).classList.contains('ck-radio-group--inline')).toBe(true);
      const [first, second] = inputs(root).map((input) => input.getBoundingClientRect());
      expect(second.top).toBe(first.top);
      host.locked.set(false);
      await settle(fixture);
      expect(groupOf(root).classList.contains('ck-radio-group--inline')).toBe(false);
      const [stackedFirst, stackedSecond] = inputs(root).map((input) =>
        input.getBoundingClientRect(),
      );
      expect(stackedSecond.top).toBeGreaterThan(stackedFirst.top);
    });
  });

  describe('forms', () => {
    it('works with Reactive Forms: null is nothing, user changes emit, writes do not', async () => {
      const { fixture, host, root } = mount(UNITS);
      await settle(fixture);
      expect(host.unitControl.invalid).toBe(true);
      inputOf(root, 1).click();
      await settle(fixture);
      expect(host.unitControl.value).toBe('lb');
      expect(host.unitControl.valid).toBe(true);
      expect(host.unitControl.dirty).toBe(true);
      host.unitControl.setValue('st');
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, true]);
      host.unitControl.setValue(null);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false]);
      expect(host.unitControl.value).toBeNull();
      host.unitControl.setValue(undefined as unknown as null);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false]);
    });

    it('works with formControlName inside a form group', async () => {
      const { fixture, host, root } = mount(
        `<form [formGroup]="formGroup"><ck-radio-group formControlName="unit" aria-label="Unit">${OPTIONS}</ck-radio-group></form>`,
      );
      await settle(fixture);
      inputOf(root, 2).click();
      await settle(fixture);
      expect(host.formGroup.value).toEqual({ unit: 'st' });
    });

    it('does not dirty a control for a programmatic write or a reset', async () => {
      const { fixture, host, root } = mount(UNITS);
      host.unitControl.setValue('kg');
      await settle(fixture);
      host.unitControl.reset();
      await settle(fixture);
      expect(host.unitControl.dirty).toBe(false);
      expect(checkedOf(root)).toEqual([false, false, false]);
    });

    it('works with ngModel', async () => {
      const { fixture, host, root } = mount(
        `<ck-radio-group [ngModel]="model()" (ngModelChange)="model.set($event)" aria-label="Unit">${OPTIONS}</ck-radio-group>`,
      );
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false]);
      inputOf(root, 0).click();
      await settle(fixture);
      expect(host.model()).toBe('kg');
      host.model.set(null);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false]);
    });

    it('works with Signal Forms, including a programmatic write', async () => {
      const { fixture, host, root } = mount(
        `<ck-radio-group [formField]="signalForm.unit" aria-label="Unit">${OPTIONS}</ck-radio-group>`,
      );
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false]);
      inputOf(root, 2).click();
      await settle(fixture);
      expect(host.signalModel().unit).toBe('st');
      expect(host.signalForm.unit().dirty()).toBe(true);
      host.signalModel.set({ unit: 'kg' });
      await settle(fixture);
      expect(checkedOf(root)).toEqual([true, false, false]);
    });
  });

  describe('dev warnings', () => {
    const warn = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const messages = (spy: ReturnType<typeof warn>) =>
      spy.mock.calls.map((call) => String(call[0]));

    it('warns when the group has no name', async () => {
      const spy = warn();
      const { fixture } = mount(
        '<ck-radio-group><ck-radio option="a">A</ck-radio></ck-radio-group>',
      );
      await settle(fixture);
      expect(
        messages(spy).filter((message) =>
          message.includes('ck-radio-group has no accessible name'),
        ),
      ).toHaveLength(1);
    });

    it.each([
      ['a label', GROUP()],
      [
        'aria-label',
        '<ck-radio-group aria-label="Unit"><ck-radio option="a">A</ck-radio></ck-radio-group>',
      ],
      [
        'aria-labelledby',
        '<b id="n">Unit</b><ck-radio-group aria-labelledby="n"><ck-radio option="a">A</ck-radio></ck-radio-group>',
      ],
    ])('does not warn when named by %s', async (_name, template) => {
      const spy = warn();
      const { fixture } = mount(template);
      await settle(fixture);
      expect(spy).not.toHaveBeenCalled();
    });

    it('warns once when the value matches no radio, however often it changes', async () => {
      const spy = warn();
      const { fixture, host, root } = mount(GROUP());
      host.unit.set('gram');
      await settle(fixture);
      host.unit.set('ounce');
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false]);
      expect(
        messages(spy).filter((message) => message.includes('matches no ck-radio')),
      ).toHaveLength(1);
    });

    it('does not warn for null, undefined or a value whose radio shows up later', async () => {
      const spy = warn();
      const { fixture, host, root } = mount(
        GROUP(
          '',
          `@for (name of options(); track name) {<ck-radio [option]="name">{{ name }}</ck-radio>}`,
        ),
      );
      host.options.set([]);
      host.unit.set('lb');
      await settle(fixture);
      host.options.set(['kg', 'lb']);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true]);
      host.unit.set(null);
      await settle(fixture);
      host.unit.set(undefined);
      await settle(fixture);
      expect(spy).not.toHaveBeenCalled();
    });

    it('warns about a radio without a name', async () => {
      const spy = warn();
      const { fixture } = mount(GROUP('', '<ck-radio option="a"></ck-radio>'));
      await settle(fixture);
      expect(
        messages(spy).some((message) => message.includes('ck-radio has no accessible name')),
      ).toBe(true);
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const spy = warn();
      TestBed.overrideComponent(RadioHost, {
        set: { template: '<ck-radio-group><ck-radio option="a">A</ck-radio></ck-radio-group>' },
      });
      TestBed.createComponent(RadioHost).destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('server rendering and hydration', () => {
    it('renders the checked state and the name into the markup and stays silent', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root } = mount(
        `<ck-radio-group value="lb" required><label>Unit</label>${OPTIONS}<ck-error>E</ck-error></ck-radio-group>`,
      );
      TestBed.inject(ApplicationRef).tick();
      expect(checkedOf(root)).toEqual([false, true, false]);
      expect(groupOf(root).getAttribute('aria-labelledby')).toBe(query(root, 'label').id);
      expect(groupOf(root).getAttribute('aria-required')).toBe('true');
      expect(query(root, 'label .ck-radio-group__required')).not.toBeNull();
      expect(query(root, 'ck-error').hidden).toBe(true);
      expect(inputs(root).every((input) => input.name === inputOf(root).name)).toBe(true);
      expect(warn).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('renders a form-bound group on the server without touching the control', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host, root } = mount(UNITS, (instance) =>
        instance.unitControl.setValue('nope'),
      );
      TestBed.inject(ApplicationRef).tick();
      expect(query(root, 'ck-error').hidden).toBe(true);
      expect(host.unitControl.touched).toBe(false);
      expect(warn).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('takes over pre-rendered markup: a stale checked state is corrected without a change', async () => {
      const { fixture, host, root } = mount(
        EMITTING(),
        (instance) => instance.unit.set('lb'),
        (rendered) => {
          inputOf(rendered, 0).checked = true;
        },
      );
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false]);
      expect(host.emitted).toEqual([]);
    });

    it('takes over a pre-rendered label id and required marker without duplicating them', async () => {
      const { fixture, root } = mount(GROUP('required'), undefined, (rendered) => {
        const label = query(rendered, 'label');
        label.id = 'server-label';
        label.insertAdjacentHTML(
          'beforeend',
          '<span class="ck-radio-group__required" aria-hidden="true"> *</span>',
        );
      });
      await settle(fixture);
      const label = query(root, 'label');
      expect(label.id).toBe('server-label');
      expect(groupOf(root).getAttribute('aria-labelledby')).toBe('server-label');
      expect(label.querySelectorAll('.ck-radio-group__required')).toHaveLength(1);
    });

    it('replaces a server-generated label id with the client one, and keeps a consumer id', async () => {
      const generated = mount(GROUP(), undefined, (rendered) => {
        query(rendered, 'label').id = 'ck-radio-group-label-9999';
      });
      await settle(generated.fixture);
      const label = query(generated.root, 'label');
      expect(label.id).not.toBe('ck-radio-group-label-9999');
      expect(label.id).toMatch(/^ck-radio-group-label-[0-9]+$/);
      expect(groupOf(generated.root).getAttribute('aria-labelledby')).toBe(label.id);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const own = mount(GROUP(), undefined, (rendered) => {
        query(rendered, 'label').id = 'my-label';
      });
      await settle(own.fixture);
      expect(groupOf(own.root).getAttribute('aria-labelledby')).toBe('my-label');
    });

    it('reuses a pre-rendered hint: one element, and aria-describedby follows its final id', async () => {
      const { fixture, root } = mount(
        GROUP('', `<ck-radio option="a">A <ck-hint>Help</ck-hint></ck-radio>`),
        undefined,
        (rendered) => {
          query(rendered, 'ck-hint').id = 'server-id';
        },
      );
      await settle(fixture);
      expect(root.querySelectorAll('ck-hint')).toHaveLength(1);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe(query(root, 'ck-hint').id);
    });
  });

  describe('performance', () => {
    it('mounts and switches among 1200 radios quickly', async () => {
      const many = Array.from({ length: 1200 }, (_, index) => `option-${index}`);
      const started = performance.now();
      const { fixture, host, root } = mount(
        EMITTING(
          '',
          `@for (name of options(); track name) {<ck-radio [option]="name">{{ name }}</ck-radio>}`,
        ),
        (instance) => instance.options.set(many),
      );
      await settle(fixture);
      const mounted = performance.now() - started;
      expect(inputs(root)).toHaveLength(1200);
      const clicked = performance.now();
      inputOf(root, 600).click();
      await settle(fixture);
      inputOf(root, 1100).click();
      await settle(fixture);
      expect(host.emitted).toEqual(['option-600', 'option-1100']);
      expect(checkedOf(root).filter(Boolean)).toHaveLength(1);
      expect(mounted).toBeLessThan(3000);
      expect(performance.now() - clicked).toBeLessThan(1500);
    });
  });

  describe('accessibility', () => {
    const MARKUP = `<ck-radio-group value="lb" required>
        <label>Weight unit</label>
        <ck-radio option="kg">Kilograms</ck-radio>
        <ck-radio option="lb">Pounds <ck-hint>Imperial</ck-hint></ck-radio>
        <ck-radio option="st" disabled>Stone</ck-radio>
        <ck-hint>Used for every lift.</ck-hint>
      </ck-radio-group>
      <ck-radio-group disabled inline value="a" aria-label="Locked">
        <ck-radio option="a">A</ck-radio><ck-radio option="b">B</ck-radio>
      </ck-radio-group>`;

    it('has no axe violations (light)', async () => {
      const { fixture, root } = mount(MARKUP);
      await settle(fixture);
      await expectNoAxeViolations(root);
    });

    it('has no axe violations (dark)', async () => {
      const { fixture, root } = mount(MARKUP, undefined, undefined, DARK_TOKENS);
      await settle(fixture);
      await expectNoAxeViolations(root);
    });

    it('has no axe violations with its error showing', async () => {
      const { fixture, root } = mount(UNITS);
      await settle(fixture);
      inputOf(root, 0).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
      await expectNoAxeViolations(root);
    });
  });
});
