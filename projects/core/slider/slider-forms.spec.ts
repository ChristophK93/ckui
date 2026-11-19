import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  mount,
  pointer,
  press,
  query,
  settle,
  tap,
  thumbOf,
  trackOf,
} from '../testing/slider-host';

const AFTER = '<button id="after">After</button>';
const valueNow = (root: HTMLElement, index = 0): string | null =>
  thumbOf(root, index).getAttribute('aria-valuenow');

describe('CkSlider forms', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  describe('standalone', () => {
    it('supports [(value)] and reports one valueChange per write', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [(value)]="value" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.value()).toBe(52);
      expect(host.emitted).toEqual([51, 52]);
      host.value.set(10);
      await settle(fixture);
      expect(valueNow(root)).toBe('10');
      expect(host.emitted).toEqual([51, 52]);
    });

    it('takes the disabled input and reacts again once enabled', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [disabled]="locked()" [(value)]="value" />`,
      );
      host.locked.set(true);
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      pointer(trackOf(root), 'pointerdown', { at: 0.9 });
      await settle(fixture);
      expect(host.value()).toBe(50);
      host.locked.set(false);
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.value()).toBe(51);
    });
  });

  describe('Reactive Forms', () => {
    const template = `<ck-slider aria-label="A" [formControl]="control" (valueCommit)="commits.push($event)" />${AFTER}`;

    it('shows the initial value and follows setValue without writing back into the control', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      expect(valueNow(root)).toBe('50');
      const changes: unknown[] = [];
      host.control.valueChanges.subscribe((value) => changes.push(value));
      host.control.setValue(30);
      await settle(fixture);
      expect(valueNow(root)).toBe('30');
      host.control.setValue(null);
      await settle(fixture);
      expect(valueNow(root)).toBe('0');
      expect(changes).toEqual([30, null]);
      expect(host.control.dirty).toBe(false);
    });

    it('writes each key step into the control, and marks it dirty', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      const changes: unknown[] = [];
      host.control.valueChanges.subscribe((value) => changes.push(value));
      expect(host.control.dirty).toBe(false);
      press(thumbOf(root), 'ArrowRight');
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.control.value).toBe(52);
      expect(host.control.dirty).toBe(true);
      expect(changes).toEqual([51, 52]);
    });

    it('writes each pointer move into the control and commits once', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      const changes: unknown[] = [];
      host.control.valueChanges.subscribe((value) => changes.push(value));
      pointer(trackOf(root), 'pointerdown', { at: 0.1 });
      pointer(trackOf(root), 'pointermove', { at: 0.2 });
      pointer(trackOf(root), 'pointerup', { at: 0.2 });
      await settle(fixture);
      expect(changes).toEqual([10, 20]);
      expect(host.commits).toEqual([20]);
    });

    it('keeps a value outside the range in the control and does not dirty it', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [min]="0" [max]="10" [step]="2" [formControl]="control" />`,
      );
      host.control.setValue(33);
      await settle(fixture);
      expect(valueNow(root)).toBe('10');
      expect(host.control.value).toBe(33);
      expect(host.control.dirty).toBe(false);
      expect(host.control.pristine).toBe(true);
    });

    it('is touched when focus leaves, not before, and not for a key step', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      thumbOf(root).focus();
      press(thumbOf(root), 'ArrowRight');
      tap(thumbOf(root), 'ArrowRight');
      expect(host.control.touched).toBe(false);
      query(root, '#after').focus();
      expect(host.control.touched).toBe(true);
    });

    it('follows disable() and enable(), and ignores input while disabled', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      host.control.disable();
      await settle(fixture);
      expect(thumbOf(root).getAttribute('aria-disabled')).toBe('true');
      expect(thumbOf(root).hasAttribute('tabindex')).toBe(false);
      press(thumbOf(root), 'ArrowRight');
      pointer(trackOf(root), 'pointerdown', { at: 0.9 });
      await settle(fixture);
      expect(host.control.value).toBe(50);
      host.control.enable();
      await settle(fixture);
      expect(thumbOf(root).hasAttribute('aria-disabled')).toBe(false);
      press(thumbOf(root), 'ArrowRight');
      expect(host.control.value).toBe(51);
    });

    it('does not report a change for a key at the limit', async () => {
      const { fixture, host, root } = mount(template, (testHost) => testHost.control.setValue(100));
      await settle(fixture);
      const changes: unknown[] = [];
      host.control.valueChanges.subscribe((value) => changes.push(value));
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(changes).toEqual([]);
      expect(host.control.dirty).toBe(false);
    });
  });

  describe('ngModel', () => {
    const template = `<ck-slider aria-label="A" [(ngModel)]="model" (valueCommit)="commits.push($event)" />${AFTER}`;

    it('shows the model and writes a user change back', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      expect(valueNow(root)).toBe('50');
      press(thumbOf(root), 'End');
      await settle(fixture);
      expect(host.model()).toBe(100);
      host.model.set(20);
      await settle(fixture);
      expect(valueNow(root)).toBe('20');
    });

    it('does not write a shown clamp back into the model', async () => {
      const { fixture, host, root } = mount(template, (testHost) => testHost.model.set(500));
      await settle(fixture);
      expect(valueNow(root)).toBe('100');
      expect(host.model()).toBe(500);
      expect(host.commits).toEqual([]);
    });

    it('takes a disabled ngModel', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [disabled]="locked()" [(ngModel)]="model" />`,
      );
      host.locked.set(true);
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.model()).toBe(50);
    });
  });

  describe('Signal Forms', () => {
    const template = `<ck-slider aria-label="A" [formField]="signalForm.grade" (valueCommit)="commits.push($event)" />${AFTER}`;

    it('shows the initial field value', async () => {
      const { fixture, root } = mount(template);
      await settle(fixture);
      expect(valueNow(root)).toBe('50');
    });

    it('writes a user change into the model and a model change into the view', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.signalModel().grade).toBe(51);
      expect(host.signalForm.grade().dirty()).toBe(true);
      host.signalModel.set({ grade: 90 });
      await settle(fixture);
      expect(valueNow(root)).toBe('90');
      host.signalModel.set({ grade: null });
      await settle(fixture);
      expect(valueNow(root)).toBe('0');
    });

    it('does not dirty the field for a programmatic write or a clamped display', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      host.signalModel.set({ grade: 12 });
      await settle(fixture);
      expect(host.signalForm.grade().dirty()).toBe(false);
      host.signalModel.set({ grade: 900 });
      await settle(fixture);
      expect(valueNow(root)).toBe('100');
      expect(host.signalModel().grade).toBe(900);
      expect(host.signalForm.grade().dirty()).toBe(false);
      expect(host.commits).toEqual([]);
    });

    it('marks the field touched when focus leaves', async () => {
      const { fixture, host, root } = mount(template);
      await settle(fixture);
      thumbOf(root).focus();
      expect(host.signalForm.grade().touched()).toBe(false);
      query(root, '#after').focus();
      await settle(fixture);
      expect(host.signalForm.grade().touched()).toBe(true);
    });

    it('follows a disabled field', async () => {
      const { fixture, host, root } = mount(template);
      host.locked.set(true);
      await settle(fixture);
      expect(thumbOf(root).getAttribute('aria-disabled')).toBe('true');
      press(thumbOf(root), 'ArrowRight');
      pointer(trackOf(root), 'pointerdown', { at: 0.9 });
      await settle(fixture);
      expect(host.signalModel().grade).toBe(50);
      host.locked.set(false);
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.signalModel().grade).toBe(51);
    });
  });
});
