import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  inputOf,
  minusOf,
  mount,
  plusOf,
  press,
  query,
  settle,
  typeInto,
} from '../testing/stepper-host';

const AFTER = '<button id="after">After</button>';

describe('CkStepper forms', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  describe('standalone', () => {
    it('supports [(value)] and reports one change per step', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="FTP" [(value)]="value" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      plusOf(root).click();
      plusOf(root).click();
      await settle(fixture);
      expect(host.value()).toBe(252);
      expect(host.emitted).toEqual([251, 252]);
    });

    it('takes the disabled input and stops reacting', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="FTP" [disabled]="locked()" [(value)]="value" />`,
      );
      host.locked.set(true);
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(true);
      press(inputOf(root), 'ArrowUp');
      plusOf(root).click();
      await settle(fixture);
      expect(host.value()).toBe(250);
      host.locked.set(false);
      await settle(fixture);
      plusOf(root).click();
      await settle(fixture);
      expect(host.value()).toBe(251);
    });
  });

  describe('Reactive Forms', () => {
    const template = `<ck-stepper aria-label="FTP" [formControl]="control" />${AFTER}`;

    it('shows the initial control value and follows setValue without a valueChanges for the view', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      expect(inputOf(root).value).toBe('250');
      const changes: unknown[] = [];
      host.control.valueChanges.subscribe((value) => changes.push(value));
      host.control.setValue(300);
      await settle(fixture);
      expect(inputOf(root).value).toBe('300');
      host.control.setValue(null);
      await settle(fixture);
      expect(inputOf(root).value).toBe('');
      expect(changes).toEqual([300, null]);
    });

    it('writes a user change into the control once, and marks it dirty', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      const changes: unknown[] = [];
      host.control.valueChanges.subscribe((value) => changes.push(value));
      expect(host.control.dirty).toBe(false);
      plusOf(root).click();
      await settle(fixture);
      expect(host.control.value).toBe(251);
      expect(changes).toEqual([251]);
      expect(host.control.dirty).toBe(true);
    });

    it('does not dirty the control for a programmatic write', async () => {
      const { fixture, host } = mount(template);
      await settle(fixture);
      host.control.setValue(280);
      await settle(fixture);
      expect(host.control.dirty).toBe(false);
    });

    it('writes null for an emptied field and a number for a typed one', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      typeInto(inputOf(root), '');
      press(inputOf(root), 'Enter');
      await settle(fixture);
      expect(host.control.value).toBeNull();
      typeInto(inputOf(root), '77');
      press(inputOf(root), 'Enter');
      await settle(fixture);
      expect(host.control.value).toBe(77);
    });

    it('marks the control touched when focus leaves, not before', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      inputOf(root).focus();
      expect(host.control.touched).toBe(false);
      typeInto(inputOf(root), '260');
      expect(host.control.touched).toBe(false);
      query(root, '#after').focus();
      await settle(fixture);
      expect(host.control.touched).toBe(true);
      expect(host.control.value).toBe(260);
    });

    it('follows disable() and enable()', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      host.control.disable();
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(true);
      expect(plusOf(root).disabled).toBe(true);
      expect(minusOf(root).disabled).toBe(true);
      plusOf(root).click();
      expect(host.control.value).toBe(250);
      host.control.enable();
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(false);
      plusOf(root).click();
      await settle(fixture);
      expect(host.control.value).toBe(251);
    });

    it('resets to the initial value through reset()', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      plusOf(root).click();
      await settle(fixture);
      host.control.reset(250);
      await settle(fixture);
      expect(inputOf(root).value).toBe('250');
      host.control.reset();
      await settle(fixture);
      expect(inputOf(root).value).toBe('');
    });
  });

  describe('ngModel', () => {
    const template =
      '<ck-stepper aria-label="FTP" [ngModel]="model()" (ngModelChange)="model.set($event); emitted.push($event)" />';

    it('shows the model, emits ngModelChange once per user change and never for a write', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      expect(inputOf(root).value).toBe('250');
      plusOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([251]);
      host.model.set(400);
      await settle(fixture);
      expect(inputOf(root).value).toBe('400');
      expect(host.emitted).toEqual([251]);
    });

    it('takes the disabled input next to ngModel', async () => {
      const { fixture, host, root } = mount(
        '<ck-stepper aria-label="FTP" [ngModel]="model()" [disabled]="locked()" (ngModelChange)="model.set($event)" />',
      );
      host.locked.set(true);
      await settle(fixture);
      plusOf(root).click();
      await settle(fixture);
      expect(host.model()).toBe(250);
      expect(inputOf(root).disabled).toBe(true);
    });
  });

  describe('Signal Forms', () => {
    const template = '<ck-stepper aria-label="FTP" [formField]="signalForm.amount" />' + AFTER;

    it('shows the initial field value', async () => {
      const { fixture, root } = mount(template);
      await settle(fixture);
      expect(inputOf(root).value).toBe('250');
    });

    it('writes a user change into the model and a model change into the view', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      plusOf(root).click();
      await settle(fixture);
      expect(host.signalModel().amount).toBe(251);
      expect(host.signalForm.amount().dirty()).toBe(true);
      host.signalModel.set({ amount: 90 });
      await settle(fixture);
      expect(inputOf(root).value).toBe('90');
      host.signalModel.set({ amount: null });
      await settle(fixture);
      expect(inputOf(root).value).toBe('');
    });

    it('does not dirty the field for a programmatic write', async () => {
      const { fixture, host } = mount(template);
      await settle(fixture);
      host.signalModel.set({ amount: 12 });
      await settle(fixture);
      expect(host.signalForm.amount().dirty()).toBe(false);
    });

    it('marks the field touched when focus leaves', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      inputOf(root).focus();
      expect(host.signalForm.amount().touched()).toBe(false);
      query(root, '#after').focus();
      await settle(fixture);
      expect(host.signalForm.amount().touched()).toBe(true);
    });

    it('takes min, max and readonly from the field schema, and follows them', async () => {
      const { fixture, host, root } = mount(template, (testHost) => {
        testHost.fieldMin.set(200);
        testHost.fieldMax.set(300);
      });
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-valuemin')).toBe('200');
      expect(inputOf(root).getAttribute('aria-valuemax')).toBe('300');
      host.signalModel.set({ amount: 300 });
      await settle(fixture);
      expect(plusOf(root).disabled).toBe(true);
      expect(minusOf(root).disabled).toBe(false);
      host.signalModel.set({ amount: 200 });
      await settle(fixture);
      expect(minusOf(root).disabled).toBe(true);
      typeInto(inputOf(root), '999');
      press(inputOf(root), 'Enter');
      await settle(fixture);
      expect(host.signalModel().amount).toBe(300);
      host.fieldMax.set(undefined);
      host.fieldMin.set(undefined);
      await settle(fixture);
      expect(inputOf(root).hasAttribute('aria-valuemin')).toBe(false);
      expect(inputOf(root).hasAttribute('aria-valuemax')).toBe(false);
      expect(plusOf(root).disabled).toBe(false);

      host.fieldReadonly.set(true);
      await settle(fixture);
      expect(inputOf(root).readOnly).toBe(true);
      expect(inputOf(root).getAttribute('aria-readonly')).toBe('true');
      expect(plusOf(root).disabled).toBe(true);
      expect(minusOf(root).disabled).toBe(true);
      press(inputOf(root), 'ArrowUp');
      await settle(fixture);
      expect(host.signalModel().amount).toBe(300);
      host.fieldReadonly.set(false);
      await settle(fixture);
      expect(inputOf(root).readOnly).toBe(false);
      expect(plusOf(root).disabled).toBe(false);
    });

    it('is disabled by a disabled field and works again when enabled', async () => {
      const { fixture, host, root } = mount(template);
      host.locked.set(true);
      await settle(fixture);
      expect(inputOf(root).disabled).toBe(true);
      plusOf(root).click();
      await settle(fixture);
      expect(host.signalModel().amount).toBe(250);
      host.locked.set(false);
      await settle(fixture);
      plusOf(root).click();
      await settle(fixture);
      expect(host.signalModel().amount).toBe(251);
    });
  });
});
