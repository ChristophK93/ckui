import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { Validators } from '@angular/forms';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import {
  CheckboxHost,
  DARK_TOKENS,
  inputOf,
  inputs,
  mount,
  query,
  settle,
} from '../testing/checkbox-host';

const OPTIONS = `<ck-checkbox option="endurance">Endurance</ck-checkbox>
  <ck-checkbox option="vo2">VO2max</ck-checkbox>
  <ck-checkbox option="tempo">Tempo</ck-checkbox>`;

const GROUP = (attributes = '', content = OPTIONS) =>
  `<ck-checkbox-group ${attributes} [(value)]="zones"><label>Zones</label>${content}</ck-checkbox-group>`;

const ZONES = `<ck-checkbox-group [formControl]="zonesControl" required>
  <label>Zones</label>${OPTIONS}
  <ck-hint>Pick at least one.</ck-hint>
  <ck-error>Pick at least one zone.</ck-error>
</ck-checkbox-group><button id="after">After</button>`;

const checkedOf = (root: HTMLElement): boolean[] => inputs(root).map((input) => input.checked);
const groupOf = (root: HTMLElement) => query(root, 'ck-checkbox-group');

describe('CkCheckboxGroup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
  });

  describe('structure and name', () => {
    it('is a group named by its first label, with an id of its own on the label', async () => {
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      const label = query(root, 'ck-checkbox-group > label');
      expect(groupOf(root).getAttribute('role')).toBe('group');
      expect(label.id).toMatch(/^ck-checkbox-group-label-\d+$/);
      expect(groupOf(root).getAttribute('aria-labelledby')).toBe(label.id);
      expect(label.classList.contains('ck-checkbox-group__label')).toBe(true);
    });

    it('replaces a server-generated label id with the client one, and keeps a consumer id', async () => {
      const generated = mount(GROUP(), undefined, (rendered) => {
        query(rendered, 'label').id = 'ck-checkbox-group-label-9999';
      });
      await settle(generated.fixture);
      const label = query(generated.root, 'label');
      expect(label.id).not.toBe('ck-checkbox-group-label-9999');
      expect(label.id).toMatch(/^ck-checkbox-group-label-[0-9]+$/);
      expect(groupOf(generated.root).getAttribute('aria-labelledby')).toBe(label.id);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const own = mount(GROUP(), undefined, (rendered) => {
        query(rendered, 'label').id = 'my-label';
      });
      await settle(own.fixture);
      expect(groupOf(own.root).getAttribute('aria-labelledby')).toBe('my-label');
    });

    it('keeps the id a consumer gave the label, static or bound', async () => {
      const { fixture, host, root } = mount(
        `<ck-checkbox-group [(value)]="zones"><label [id]="hintId()">Zones</label>${OPTIONS}</ck-checkbox-group>`,
      );
      await settle(fixture);
      expect(groupOf(root).getAttribute('aria-labelledby')).toBe('hint-a');
      host.hintId.set('hint-b');
      await settle(fixture);
      expect(query(root, 'label').id).toBe('hint-b');
      expect(groupOf(root).getAttribute('aria-labelledby')).toBe('hint-b');
    });

    it('takes over a pre-rendered label id and required marker without duplicating them', async () => {
      const { fixture, root } = mount(GROUP('required'), undefined, (rendered) => {
        const label = query(rendered, 'label');
        label.id = 'server-label';
        label.insertAdjacentHTML(
          'beforeend',
          '<span class="ck-checkbox-group__required" aria-hidden="true"> *</span>',
        );
      });
      await settle(fixture);
      const label = query(root, 'label');
      expect(label.id).toBe('server-label');
      expect(groupOf(root).getAttribute('aria-labelledby')).toBe('server-label');
      expect(label.querySelectorAll('.ck-checkbox-group__required')).toHaveLength(1);
    });

    it('lets aria-label and aria-labelledby inputs name the group, and removes them from the host markup', async () => {
      const labelled = mount(
        GROUP('aria-label="Heart rate zones"', OPTIONS).replace('<label>Zones</label>', ''),
      );
      await settle(labelled.fixture);
      expect(groupOf(labelled.root).getAttribute('aria-label')).toBe('Heart rate zones');
      expect(groupOf(labelled.root).hasAttribute('aria-labelledby')).toBe(false);
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const outside = mount(`<h3 id="outside">Outside</h3>${GROUP('aria-labelledby="outside"')}`);
      await settle(outside.fixture);
      expect(groupOf(outside.root).getAttribute('aria-labelledby')).toBe('outside');
    });

    it('draws a required marker on the label, and removes it again', async () => {
      const { fixture, host, root } = mount(
        `<ck-checkbox-group [(value)]="zones" [required]="locked()"><label>Zones</label>${OPTIONS}</ck-checkbox-group>`,
      );
      host.locked.set(true);
      await settle(fixture);
      const label = query(root, 'label');
      expect(label.querySelectorAll('.ck-checkbox-group__required')).toHaveLength(1);
      expect(label.classList.contains('ck-checkbox-group__label--required')).toBe(true);
      host.locked.set(false);
      await settle(fixture);
      expect(label.querySelectorAll('.ck-checkbox-group__required')).toHaveLength(0);
    });

    it('does not set aria-required, which a group does not allow', async () => {
      const { fixture, root } = mount(GROUP('required'));
      await settle(fixture);
      expect(groupOf(root).hasAttribute('aria-required')).toBe(false);
    });

    it('puts the label above the list and the hint below it', async () => {
      const { fixture, root } = mount(GROUP('', `${OPTIONS}<ck-hint>Pick some.</ck-hint>`));
      await settle(fixture);
      const label = query(root, 'label').getBoundingClientRect();
      const first = inputs(root)[0].getBoundingClientRect();
      const last = inputs(root)[2].getBoundingClientRect();
      const hint = query(
        root,
        'ck-checkbox-group > ck-hint, .ck-checkbox-group__messages ck-hint',
      ).getBoundingClientRect();
      expect(label.bottom).toBeLessThanOrEqual(first.top);
      expect(hint.top).toBeGreaterThanOrEqual(last.bottom);
    });
  });

  describe('the array', () => {
    it('checks the boxes of the options in the array', async () => {
      const { fixture, host, root } = mount(GROUP());
      host.zones.set(['vo2']);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false]);
    });

    it('keeps the order of the checkboxes in the page, whatever order they were clicked in', async () => {
      const { fixture, host, root } = mount(GROUP());
      await settle(fixture);
      inputOf(root, 2).click();
      inputOf(root, 0).click();
      inputOf(root, 1).click();
      await settle(fixture);
      expect(host.zones()).toEqual(['endurance', 'vo2', 'tempo']);
      inputOf(root, 1).click();
      await settle(fixture);
      expect(host.zones()).toEqual(['endurance', 'tempo']);
    });

    it('emits a new array for each user change and nothing for a programmatic write', async () => {
      const { fixture, host, root } = mount(
        '<ck-checkbox-group [value]="zones()" (valueChange)="emitted.push($event)"><label>Z</label><ck-checkbox option="a">A</ck-checkbox></ck-checkbox-group>',
      );
      await settle(fixture);
      host.zones.set(['a']);
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      const before = host.zones();
      inputOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([[]]);
      expect(host.zones()).toBe(before);
    });

    it('keeps values no checkbox has, at the end, and warns once', async () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host, root } = mount(GROUP());
      host.zones.set(['legacy', 'vo2']);
      await settle(fixture);
      inputOf(root, 0).click();
      await settle(fixture);
      expect(host.zones()).toEqual(['endurance', 'vo2', 'legacy']);
      inputOf(root, 2).click();
      await settle(fixture);
      expect(host.zones()).toEqual(['endurance', 'vo2', 'tempo', 'legacy']);
      const unknownWarnings = spy.mock.calls.filter((call) =>
        String(call[0]).includes('no checkbox has'),
      );
      expect(unknownWarnings).toHaveLength(1);
    });

    it('compares options with Object.is: objects by identity, NaN equal to itself', async () => {
      const { fixture, host, root } = mount(
        `<ck-checkbox-group [(value)]="zones"><label>Pick</label>
          @for (item of objectOptions; track item.id) {<ck-checkbox [option]="item">{{ item.id }}</ck-checkbox>}
          <ck-checkbox [option]="nan">NaN</ck-checkbox></ck-checkbox-group>`,
        (instance) => Object.assign(instance, { nan: Number.NaN }),
      );
      host.zones.set([host.objectOptions[1], Number.NaN]);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false, true]);
      host.zones.set([{ id: 1 }]);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false, false]);
      inputOf(root, 0).click();
      await settle(fixture);
      expect(host.zones()[0]).toBe(host.objectOptions[0]);
    });

    it('supports options of undefined, null and 0 apart from an unset option', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host, root } = mount(
        `<ck-checkbox-group [(value)]="zones"><label>Pick</label>
          <ck-checkbox [option]="undefined">U</ck-checkbox>
          <ck-checkbox [option]="null">N</ck-checkbox>
          <ck-checkbox [option]="0">Z</ck-checkbox></ck-checkbox-group>`,
      );
      await settle(fixture);
      inputOf(root, 1).click();
      inputOf(root, 0).click();
      await settle(fixture);
      expect(host.zones()).toEqual([undefined, null]);
      expect(warn).not.toHaveBeenCalled();
    });

    it('follows checkboxes that are added and removed, in page order', async () => {
      const { fixture, host, root } = mount(
        `<ck-checkbox-group [(value)]="zones"><label>Zones</label>
          <ck-checkbox option="endurance">Endurance</ck-checkbox>
          @if (showTempo()) {<ck-checkbox option="tempo">Tempo</ck-checkbox>}
          @for (name of options(); track name) {@if (name === 'vo2') {<ck-checkbox [option]="name">VO2</ck-checkbox>}}
        </ck-checkbox-group>`,
      );
      host.zones.set(['vo2']);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, true]);
      inputOf(root, 0).click();
      await settle(fixture);
      expect(host.zones()).toEqual(['endurance', 'vo2']);
      host.showTempo.set(false);
      await settle(fixture);
      expect(inputs(root)).toHaveLength(2);
      host.showTempo.set(true);
      await settle(fixture);
      inputOf(root, 1).click();
      await settle(fixture);
      expect(host.zones()).toEqual(['endurance', 'tempo', 'vo2']);
    });

    it('treats null, undefined and a non-array from a form as empty and does not throw', async () => {
      const { fixture, host, root } = mount(
        '<ck-checkbox-group [formControl]="zonesControl"><label>Z</label><ck-checkbox option="a">A</ck-checkbox></ck-checkbox-group>',
      );
      await settle(fixture);
      for (const odd of [null, undefined, 'a' as unknown as string[]]) {
        host.zonesControl.setValue(odd as string[] | null);
        await settle(fixture);
        expect(checkedOf(root)).toEqual([false]);
      }
      inputOf(root).click();
      await settle(fixture);
      expect(host.zonesControl.value).toEqual(['a']);
    });

    it('survives a burst of fast clicks without losing a change', async () => {
      const { fixture, host, root } = mount(GROUP());
      await settle(fixture);
      for (let count = 0; count < 9; count++) {
        inputOf(root, count % 3).click();
      }
      await settle(fixture);
      expect(host.zones()).toEqual(['endurance', 'vo2', 'tempo']);
    });
  });

  describe('description and errors', () => {
    const errorOf = (root: HTMLElement) => query(root, 'ck-error');

    it('lists the group hints in aria-describedby and not the hints of its checkboxes', async () => {
      const { fixture, root } = mount(
        GROUP(
          '',
          `<ck-checkbox option="a">A <ck-hint>About A</ck-hint></ck-checkbox>
           <ck-hint>Pick some.</ck-hint>`,
        ),
      );
      await settle(fixture);
      const [own, groupHint] = Array.from(root.querySelectorAll('ck-hint'));
      expect(groupOf(root).getAttribute('aria-describedby')).toBe(groupHint.id);
      expect(inputOf(root).getAttribute('aria-describedby')).toBe(own.id);
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
      expect(groupOf(root).hasAttribute('aria-describedby')).toBe(true);
    });

    it('hides the error while untouched, and the checkboxes are not invalid', async () => {
      const { fixture, root } = mount(ZONES);
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      expect(inputs(root).every((input) => !input.hasAttribute('aria-invalid'))).toBe(true);
      expect(groupOf(root).getAttribute('aria-describedby')).toBe(query(root, 'ck-hint').id);
    });

    it('does not touch the group while focus moves between its checkboxes', async () => {
      const { fixture, host, root } = mount(ZONES);
      await settle(fixture);
      inputOf(root, 0).focus();
      await userEvent.tab();
      await userEvent.tab();
      expect(document.activeElement).toBe(inputOf(root, 2));
      await settle(fixture);
      expect(host.zonesControl.touched).toBe(false);
      expect(errorOf(root).hidden).toBe(true);
    });

    it('is not touched, and shows no error, while a press lands on the text of another checkbox', async () => {
      const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 30));
      const { fixture, host, root } = mount(ZONES);
      await settle(fixture);
      inputOf(root, 0).focus();
      await userEvent.click(query(root, 'ck-checkbox:nth-of-type(3) .ck-checkbox__text'));
      await pause();
      await settle(fixture);
      expect(host.zonesControl.touched).toBe(false);
      expect(errorOf(root).hidden).toBe(true);
      await userEvent.click(query(root, 'ck-checkbox:nth-of-type(2) .ck-checkbox__text'));
      await pause();
      await settle(fixture);
      expect(host.zonesControl.touched).toBe(false);
      await userEvent.click(query(root, '#after'));
      await pause();
      await settle(fixture);
      expect(host.zonesControl.touched).toBe(true);
    });

    it('is touched, and shows the error, when focus leaves the whole group', async () => {
      const { fixture, host, root } = mount(ZONES);
      await settle(fixture);
      inputOf(root, 0).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(host.zonesControl.touched).toBe(true);
      expect(errorOf(root).hidden).toBe(false);
      for (const input of inputs(root)) {
        expect(input.getAttribute('aria-invalid')).toBe('true');
      }
      expect(groupOf(root).hasAttribute('aria-invalid')).toBe(false);
      expect(groupOf(root).getAttribute('aria-describedby')).toBe(
        `${query(root, 'ck-hint').id} ${errorOf(root).id}`,
      );
    });

    it('hides the error again when the first box is checked', async () => {
      const { fixture, root } = mount(ZONES);
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
        `<form [formGroup]="formGroup"><ck-checkbox-group formControlName="zones"><label>Z</label>${OPTIONS}
          <ck-error>Pick one.</ck-error></ck-checkbox-group></form>`,
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
      const { fixture, host, root } = mount(ZONES);
      host.zonesControl.setValue(['vo2']);
      await settle(fixture);
      inputOf(root, 0).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
    });

    it('does not show a checkbox error of its own inside a group', async () => {
      const { fixture, root } = mount(
        ZONES.replace(
          '<ck-checkbox option="vo2">VO2max</ck-checkbox>',
          '<ck-checkbox option="vo2">VO2max<ck-error>Own</ck-error></ck-checkbox>',
        ),
      );
      await settle(fixture);
      inputOf(root, 0).focus();
      query(root, '#after').focus();
      await settle(fixture);
      const own = Array.from(root.querySelectorAll('ck-error')).find(
        (error) => error.textContent === 'Own',
      ) as HTMLElement;
      expect(own.hidden).toBe(true);
      expect(inputOf(root, 1).getAttribute('aria-describedby')).toBeNull();
    });

    it('works with Signal Forms: touched on leaving the group, invalid until one is picked', async () => {
      const { fixture, host, root } = mount(
        `<ck-checkbox-group [formField]="signalForm.zones"><label>Z</label>${OPTIONS}
          <ck-error>Pick one.</ck-error></ck-checkbox-group><button id="after">After</button>`,
        (instance) => instance.signalModel.set({ accepted: true, zones: [] }),
      );
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      inputOf(root, 0).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(host.signalForm.zones().touched()).toBe(true);
      expect(errorOf(root).hidden).toBe(false);
      inputOf(root, 2).click();
      await settle(fixture);
      expect(host.signalModel().zones).toEqual(['tempo']);
      expect(errorOf(root).hidden).toBe(true);
    });
  });

  describe('disabled and size', () => {
    it('disables every checkbox with the group, also from the forms API', async () => {
      const { fixture, host, root } = mount(GROUP('[disabled]="locked()"'));
      await settle(fixture);
      host.locked.set(true);
      await settle(fixture);
      expect(inputs(root).every((input) => input.disabled)).toBe(true);
      expect(groupOf(root).classList.contains('ck-checkbox-group--disabled')).toBe(true);
      inputOf(root, 0).click();
      query(root, '.ck-checkbox__text').click();
      await settle(fixture);
      expect(host.zones()).toEqual([]);
      host.locked.set(false);
      await settle(fixture);
      inputOf(root, 0).click();
      expect(host.zones()).toEqual(['endurance']);

      host.zonesControl.disable();
    });

    it('disables the checkboxes when the form control is disabled', async () => {
      const { fixture, host, root } = mount(ZONES);
      host.zonesControl.disable();
      await settle(fixture);
      expect(inputs(root).every((input) => input.disabled)).toBe(true);
      host.zonesControl.enable();
      await settle(fixture);
      expect(inputs(root).every((input) => !input.disabled)).toBe(true);
    });

    it('keeps a single checkbox disabled on its own', async () => {
      const { fixture, root } = mount(
        GROUP(
          '',
          '<ck-checkbox option="a" disabled>A</ck-checkbox><ck-checkbox option="b">B</ck-checkbox>',
        ),
      );
      await settle(fixture);
      expect(inputs(root).map((input) => input.disabled)).toEqual([true, false]);
    });

    it('is blocked inside a disabled fieldset', async () => {
      const { fixture, host, root } = mount(`<fieldset disabled>${GROUP()}</fieldset>`);
      await settle(fixture);
      inputOf(root, 0).click();
      query(root, '.ck-checkbox__text').click();
      await settle(fixture);
      expect(host.zones()).toEqual([]);
    });

    it('gives the checkboxes the size of the group, unless they set their own', async () => {
      const { fixture, root } = mount(
        GROUP(
          'size="lg"',
          '<ck-checkbox option="a">A</ck-checkbox><ck-checkbox option="b" size="sm">B</ck-checkbox>',
        ),
      );
      await settle(fixture);
      const [first, second] = Array.from(root.querySelectorAll('.ck-checkbox'));
      expect(first.classList.contains('ck-checkbox--lg')).toBe(true);
      expect(second.classList.contains('ck-checkbox--sm')).toBe(true);
      expect(groupOf(root).classList.contains('ck-checkbox-group--lg')).toBe(true);
    });

    it('uses the size from provideCkui when none is set', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'xl' })] });
      const { fixture, root } = mount(GROUP());
      await settle(fixture);
      expect(query(root, '.ck-checkbox').classList.contains('ck-checkbox--xl')).toBe(true);
      expect(groupOf(root).classList.contains('ck-checkbox-group--xl')).toBe(true);
    });
  });

  describe('forms', () => {
    it('works with Reactive Forms and Validators.required, which an empty array fails', async () => {
      const { fixture, host, root } = mount(ZONES);
      await settle(fixture);
      expect(host.zonesControl.invalid).toBe(true);
      inputOf(root, 1).click();
      await settle(fixture);
      expect(host.zonesControl.value).toEqual(['vo2']);
      expect(host.zonesControl.valid).toBe(true);
      expect(host.zonesControl.dirty).toBe(true);
      host.zonesControl.setValue(['tempo', 'endurance']);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([true, false, true]);
      inputOf(root, 1).click();
      await settle(fixture);
      expect(host.zonesControl.value).toEqual(['endurance', 'vo2', 'tempo']);
    });

    it('is not made invalid by Validators.minLength(1) for an empty array, which Angular skips', async () => {
      const { fixture, host } = mount(
        '<ck-checkbox-group [formControl]="zonesControl"><label>Z</label><ck-checkbox option="a">A</ck-checkbox></ck-checkbox-group>',
      );
      host.zonesControl.setValidators(Validators.minLength(1));
      host.zonesControl.updateValueAndValidity();
      await settle(fixture);
      expect(host.zonesControl.valid).toBe(true);
      host.zonesControl.setValidators(Validators.required);
      host.zonesControl.updateValueAndValidity();
      expect(host.zonesControl.invalid).toBe(true);
    });

    it('does not dirty a control for a programmatic write or a reset', async () => {
      const { fixture, host } = mount(ZONES);
      host.zonesControl.setValue(['vo2']);
      await settle(fixture);
      host.zonesControl.reset();
      await settle(fixture);
      expect(host.zonesControl.dirty).toBe(false);
    });

    it('works with ngModel', async () => {
      const { fixture, host, root } = mount(
        `<ck-checkbox-group [ngModel]="zonesModel()" (ngModelChange)="zonesModel.set($event)"><label>Z</label>${OPTIONS}</ck-checkbox-group>`,
      );
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false]);
      inputOf(root, 0).click();
      await settle(fixture);
      expect(host.zonesModel()).toEqual(['endurance', 'vo2']);
      host.zonesModel.set(null);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false]);
    });

    it('works with Signal Forms, including a disabled field', async () => {
      const { fixture, host, root } = mount(
        `<ck-checkbox-group [formField]="signalForm.zones"><label>Z</label>${OPTIONS}</ck-checkbox-group>`,
      );
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, true, false]);
      inputOf(root, 2).click();
      await settle(fixture);
      expect(host.signalModel().zones).toEqual(['vo2', 'tempo']);
      expect(host.signalForm.zones().dirty()).toBe(true);
      host.signalModel.set({ accepted: true, zones: ['endurance'] });
      await settle(fixture);
      expect(checkedOf(root)).toEqual([true, false, false]);
    });

    it('is empty by default and works two-way', async () => {
      const { fixture, host, root } = mount(`${GROUP()}<output>{{ zones().join(',') }}</output>`);
      await settle(fixture);
      expect(checkedOf(root)).toEqual([false, false, false]);
      inputOf(root, 1).click();
      await settle(fixture);
      expect(query(root, 'output').textContent).toBe('vo2');
      expect(host.zones()).toEqual(['vo2']);
    });
  });

  describe('dev warnings', () => {
    const warn = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    it('warns when the group has no name', async () => {
      const spy = warn();
      const { fixture } = mount(
        '<ck-checkbox-group><ck-checkbox option="a">A</ck-checkbox></ck-checkbox-group>',
      );
      await settle(fixture);
      expect(
        spy.mock.calls.filter((call) =>
          String(call[0]).includes('ck-checkbox-group has no accessible name'),
        ),
      ).toHaveLength(1);
    });

    it.each([
      ['a label', GROUP()],
      [
        'aria-label',
        '<ck-checkbox-group aria-label="Zones"><ck-checkbox option="a">A</ck-checkbox></ck-checkbox-group>',
      ],
      [
        'aria-labelledby',
        '<b id="n">Zones</b><ck-checkbox-group aria-labelledby="n"><ck-checkbox option="a">A</ck-checkbox></ck-checkbox-group>',
      ],
    ])('does not warn when named by %s', async (_name, template) => {
      const spy = warn();
      const { fixture } = mount(template);
      await settle(fixture);
      expect(spy).not.toHaveBeenCalled();
    });

    it('warns about a checkbox without an option', async () => {
      const spy = warn();
      const { fixture } = mount(GROUP('', '<ck-checkbox>Loose</ck-checkbox>'));
      await settle(fixture);
      expect(spy.mock.calls.some((call) => String(call[0]).includes('needs an option'))).toBe(true);
    });

    it('warns about a checkbox with its own value or its own form binding', async () => {
      const spy = warn();
      const { fixture } = mount(
        GROUP(
          '',
          '<ck-checkbox option="a" [value]="true">A</ck-checkbox><ck-checkbox option="b" [formControl]="control">B</ck-checkbox>',
        ),
      );
      await settle(fixture);
      const messages = spy.mock.calls.map((call) => String(call[0]));
      expect(messages.some((message) => message.includes('has its own value'))).toBe(true);
      expect(messages.some((message) => message.includes('own form binding'))).toBe(true);
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const spy = warn();
      TestBed.overrideComponent(CheckboxHost, {
        set: {
          template:
            '<ck-checkbox-group><ck-checkbox option="a">A</ck-checkbox></ck-checkbox-group>',
        },
      });
      TestBed.createComponent(CheckboxHost).destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('server rendering', () => {
    it('renders the checked state and the name into the markup and stays silent', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root } = mount(
        `<ck-checkbox-group [value]="['vo2']" required><label>Zones</label>${OPTIONS}<ck-error>E</ck-error></ck-checkbox-group>`,
      );
      TestBed.inject(ApplicationRef).tick();
      expect(checkedOf(root)).toEqual([false, true, false]);
      expect(groupOf(root).getAttribute('aria-labelledby')).toBe(query(root, 'label').id);
      expect(query(root, 'label .ck-checkbox-group__required')).not.toBeNull();
      expect(query(root, 'ck-error').hidden).toBe(true);
      expect(warn).not.toHaveBeenCalled();
      fixture.destroy();
    });
  });

  describe('accessibility', () => {
    const MARKUP = `<ck-checkbox-group [value]="['vo2']" required>
        <label>Zones</label>${OPTIONS}<ck-hint>Pick at least one.</ck-hint>
      </ck-checkbox-group>
      <ck-checkbox-group disabled aria-label="Locked"><ck-checkbox option="a">A</ck-checkbox></ck-checkbox-group>`;

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
      const { fixture, root } = mount(ZONES);
      await settle(fixture);
      inputOf(root, 0).focus();
      query(root, '#after').focus();
      await settle(fixture);
      expect(query(root, 'ck-error').hidden).toBe(false);
      await expectNoAxeViolations(root);
    });
  });
});
