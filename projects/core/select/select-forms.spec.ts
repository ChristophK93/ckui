import { vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
  KINDS,
  cleanUp,
  fakeMedia,
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

const REACTIVE = `<button type="button" id="elsewhere">Elsewhere</button>
  <ck-select aria-label="Target" placeholder="Pick one" [formControl]="control">${KINDS}</ck-select>`;
const NG_MODEL = `<form #ngForm="ngForm" (ngSubmit)="submits.update((count) => count + 1)">
  <ck-select aria-label="Target" name="kind" placeholder="Pick one" [(ngModel)]="model" required>${KINDS}</ck-select>
  <button type="submit" id="send">Send</button>
</form>`;
const SIGNAL_FORM = `<button type="button" id="elsewhere">Elsewhere</button>
  <ck-select aria-label="Target" placeholder="Pick one" [formField]="signalForm.kind">${KINDS}</ck-select>`;

describe('CkSelect forms', () => {
  afterEach(cleanUp);

  describe('without a forms API', () => {
    it('reports user changes through valueChange once and programmatic ones not at all', async () => {
      const { fixture, root, host } = mount(
        `<ck-select aria-label="Target" [value]="value()" (valueChange)="emitted.push($event); value.set($event)">${KINDS}</ck-select>`,
      );
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      optionsOf()[1].click();
      await settle(fixture);
      expect(host.emitted).toEqual(['watt']);
      host.value.set('level');
      await settle(fixture);
      expect(host.emitted).toEqual(['watt']);
      expect(shownValue(root)).toBe('Level');
    });

    it('does not emit when the picked option is already selected', async () => {
      const { fixture, root, host } = mount(
        `<ck-select aria-label="Target" [value]="value()" (valueChange)="emitted.push($event)">${KINDS}</ck-select>`,
        (state) => state.value.set('watt'),
      );
      await settle(fixture);
      triggerOf(root).click();
      await settle(fixture);
      optionsOf()[1].click();
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(popup()).toBeNull();
    });

    it('reports touched through the touched model when focus leaves', async () => {
      const { fixture, root, host } = mount(
        `<ck-select aria-label="Target" (touchedChange)="emitted.push($event)">${KINDS}</ck-select><button id="elsewhere">x</button>`,
      );
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      root.querySelector<HTMLElement>('#elsewhere')!.focus();
      await settle(fixture);
      expect(host.emitted).toEqual([true]);
    });
  });

  describe('Reactive Forms', () => {
    it('shows the control value, also set later, without writing it back', async () => {
      const { fixture, root, host } = mount(REACTIVE, (state) => state.control.setValue('level'));
      await settle(fixture);
      expect(shownValue(root)).toBe('Level');
      const changes: unknown[] = [];
      host.control.valueChanges.subscribe((value) => changes.push(value));
      host.control.setValue('watt');
      await settle(fixture);
      expect(shownValue(root)).toBe('Watts');
      expect(changes).toEqual(['watt']);
      expect(host.control.dirty).toBe(false);
      host.control.reset();
      await settle(fixture);
      expect(shownValue(root)).toBe('Pick one');
      expect(host.control.value).toBeNull();
    });

    it('writes a pick to the control once and marks it dirty, not touched yet', async () => {
      const { fixture, root, host } = mount(REACTIVE);
      await settle(fixture);
      const changes: unknown[] = [];
      host.control.valueChanges.subscribe((value) => changes.push(value));
      const trigger = triggerOf(root);
      trigger.focus();
      trigger.click();
      await settle(fixture);
      optionsOf()[2].click();
      await settle(fixture);
      expect(changes).toEqual(['level']);
      expect(host.control.value).toBe('level');
      expect(host.control.dirty).toBe(true);
      expect(host.control.touched).toBe(false);
    });

    it('marks the control touched when focus leaves the trigger, not when it is open', async () => {
      const { fixture, root, host } = mount(REACTIVE);
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      press(trigger, 'ArrowDown');
      await settle(fixture);
      expect(host.control.touched).toBe(false);
      press(trigger, 'Escape');
      await settle(fixture);
      expect(host.control.touched).toBe(false);
      root.querySelector<HTMLElement>('#elsewhere')!.focus();
      await settle(fixture);
      expect(host.control.touched).toBe(true);
    });

    it('marks it touched when Tab selects and moves on', async () => {
      const { fixture, root, host } = mount(REACTIVE);
      await settle(fixture);
      triggerOf(root).focus();
      press(triggerOf(root), 'ArrowDown');
      await settle(fixture);
      await userEvent.tab();
      await settle(fixture);
      expect(host.control.value).toBe('ftp');
      expect(host.control.touched).toBe(true);
    });

    it('marks it touched when an outside click closes the list', async () => {
      const { fixture, root, host } = mount(REACTIVE);
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      trigger.click();
      await settle(fixture);
      expect(host.control.touched).toBe(false);
      await userEvent.click(root.querySelector<HTMLElement>('#elsewhere')!);
      await settle(fixture);
      expect(popup()).toBeNull();
      expect(host.control.touched).toBe(true);
    });

    it('does not mark it touched while focus moves between the trigger and the search field', async () => {
      const { fixture, root, host } = mount(
        `<button type="button" id="elsewhere">Elsewhere</button>
         <ck-select aria-label="Target" filter [formControl]="control">${KINDS}</ck-select>`,
      );
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      trigger.click();
      await settle(fixture);
      expect(document.activeElement).toBe(searchInput());
      expect(host.control.touched).toBe(false);
      await userEvent.keyboard('{Escape}');
      await settle(fixture);
      expect(document.activeElement).toBe(trigger);
      expect(host.control.touched).toBe(false);
      trigger.click();
      await settle(fixture);
      root.querySelector<HTMLElement>('#elsewhere')!.focus();
      await settle(fixture);
      expect(host.control.touched).toBe(true);
    });

    it('does not mark it touched when a sheet opens, picks and closes; only when focus leaves later', async () => {
      fakeMedia(true);
      const { fixture, root, host } = mount(REACTIVE);
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.focus();
      trigger.click();
      await settle(fixture);
      expect(document.activeElement).toBe(listbox());
      expect(host.control.touched).toBe(false);
      optionsOf()[0].click();
      await settle(fixture);
      await wait(20);
      expect(host.control.value).toBe('ftp');
      expect(document.activeElement).toBe(trigger);
      expect(host.control.touched).toBe(false);
      root.querySelector<HTMLElement>('#elsewhere')!.focus();
      await settle(fixture);
      expect(host.control.touched).toBe(true);
    });

    it('disables and enables the trigger with the control and closes an open list', async () => {
      const { fixture, root, host } = mount(REACTIVE);
      await settle(fixture);
      const trigger = triggerOf(root);
      trigger.click();
      await settle(fixture);
      host.control.disable();
      await settle(fixture);
      await wait(20);
      expect(trigger.disabled).toBe(true);
      expect(popup()).toBeNull();
      host.control.enable();
      await settle(fixture);
      expect(trigger.disabled).toBe(false);
      trigger.click();
      await settle(fixture);
      expect(popup()).not.toBeNull();
    });

    it('keeps an unknown control value and shows the placeholder without touching the control', async () => {
      const { fixture, root, host } = mount(REACTIVE, (state) => state.control.setValue('nope'));
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      await settle(fixture);
      expect(shownValue(root)).toBe('Pick one');
      expect(host.control.value).toBe('nope');
      expect(host.control.dirty).toBe(false);
    });
  });

  describe('ngModel', () => {
    it('shows the model after the first write, writes a pick back and emits once', async () => {
      const { fixture, root, host } = mount(NG_MODEL, (state) => state.model.set('watt'));
      await settle(fixture);
      expect(shownValue(root)).toBe('Watts');
      triggerOf(root).click();
      await settle(fixture);
      optionsOf()[0].click();
      await settle(fixture);
      expect(host.model()).toBe('ftp');
      expect(shownValue(root)).toBe('% FTP');
    });

    it('is invalid while required and empty, valid after a pick, and submits', async () => {
      const { fixture, root, host } = mount(NG_MODEL);
      await settle(fixture);
      const select = root.querySelector('ck-select')!;
      expect(select.classList.contains('ng-invalid')).toBe(true);
      root.querySelector<HTMLButtonElement>('#send')!.click();
      await settle(fixture);
      expect(select.classList.contains('ng-invalid')).toBe(true);
      triggerOf(root).click();
      await settle(fixture);
      optionsOf()[1].click();
      await settle(fixture);
      expect(select.classList.contains('ng-valid')).toBe(true);
      expect(select.classList.contains('ng-dirty')).toBe(true);
      root.querySelector<HTMLButtonElement>('#send')!.click();
      await settle(fixture);
      expect(host.submits()).toBe(2);
    });

    it('goes touched on blur', async () => {
      const { fixture, root } = mount(NG_MODEL);
      await settle(fixture);
      const select = root.querySelector('ck-select')!;
      triggerOf(root).focus();
      expect(select.classList.contains('ng-untouched')).toBe(true);
      root.querySelector<HTMLElement>('#send')!.focus();
      await settle(fixture);
      expect(select.classList.contains('ng-touched')).toBe(true);
    });
  });

  describe('Signal Forms', () => {
    it('reads the model, writes a pick and follows the disabled rule', async () => {
      const { fixture, root, host } = mount(SIGNAL_FORM, (state) =>
        state.signalModel.set({ kind: 'level' }),
      );
      await settle(fixture);
      expect(shownValue(root)).toBe('Level');
      triggerOf(root).click();
      await settle(fixture);
      optionsOf()[1].click();
      await settle(fixture);
      expect(host.signalModel().kind).toBe('watt');
      host.signalModel.set({ kind: 'ftp' });
      await settle(fixture);
      expect(shownValue(root)).toBe('% FTP');
      host.locked.set(true);
      await settle(fixture);
      expect(triggerOf(root).disabled).toBe(true);
      host.locked.set(false);
      await settle(fixture);
      expect(triggerOf(root).disabled).toBe(false);
    });

    it('is touched after the trigger lost focus, and shows the form as invalid until picked', async () => {
      const { fixture, root, host } = mount(SIGNAL_FORM);
      await settle(fixture);
      expect(host.signalForm.kind().invalid()).toBe(true);
      expect(host.signalForm.kind().touched()).toBe(false);
      triggerOf(root).focus();
      press(triggerOf(root), 'ArrowDown');
      press(triggerOf(root), 'Enter');
      await settle(fixture);
      expect(host.signalForm.kind().touched()).toBe(false);
      root.querySelector<HTMLElement>('#elsewhere')!.focus();
      await settle(fixture);
      expect(host.signalForm.kind().touched()).toBe(true);
      expect(host.signalForm.kind().invalid()).toBe(false);
      expect(host.signalModel().kind).toBe('ftp');
    });
  });
});
