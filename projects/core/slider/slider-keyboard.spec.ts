import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { mount, press, settle, tap, thumbOf } from '../testing/slider-host';

const SLIDER = (attributes = '') =>
  `<ck-slider aria-label="Grade" ${attributes} [value]="value()" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" />`;

describe('CkSlider keyboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    TestBed.resetTestingModule();
  });

  describe('the key map', () => {
    it.each([
      ['ArrowRight', 51],
      ['ArrowUp', 51],
      ['ArrowLeft', 49],
      ['ArrowDown', 49],
      ['PageUp', 60],
      ['PageDown', 40],
      ['Home', 0],
      ['End', 100],
    ])('%s moves 50 to %s', async (key, expected) => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      const event = press(thumbOf(root), key);
      await settle(fixture);
      expect(host.emitted).toEqual([expected]);
      expect(event.defaultPrevented).toBe(true);
    });

    it('steps by the step, counted from min', async () => {
      const { fixture, host, root } = mount(SLIDER('[min]="2" [max]="20" [step]="5"'), (testHost) =>
        testHost.value.set(7),
      );
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      press(thumbOf(root), 'ArrowRight');
      press(thumbOf(root), 'ArrowLeft');
      await settle(fixture);
      expect(host.emitted).toEqual([12, 17, 12]);
    });

    it('moves a value that is off the step to the next step in the direction, from what is shown', async () => {
      const { fixture, host, root } = mount(SLIDER('[step]="0.5"'), (testHost) =>
        testHost.value.set(33.2),
      );
      await settle(fixture);
      // 33.2 is shown as 33; one step right is 33.5.
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.emitted).toEqual([33.5]);
    });

    it('moves a page by ten steps, or by largeStep, and never past the range', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [step]="0.5" [value]="50" (valueChange)="emitted.push($event)" />
         <ck-slider aria-label="B" [largeStep]="25" [value]="50" (valueChange)="emitted.push($event)" />
         <ck-slider aria-label="C" [max]="5" [value]="2" (valueChange)="emitted.push($event)" />
         <ck-slider aria-label="D" [largeStep]="-4" [value]="50" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      press(thumbOf(root, 0), 'PageUp');
      press(thumbOf(root, 1), 'PageUp');
      press(thumbOf(root, 2), 'PageUp');
      press(thumbOf(root, 2), 'PageDown');
      press(thumbOf(root, 2), 'PageDown');
      press(thumbOf(root, 3), 'PageDown');
      await settle(fixture);
      expect(host.emitted).toEqual([55, 75, 5, 0, 40]);
    });

    it('ends on the last step that fits when max is off the step', async () => {
      const { fixture, host, root } = mount(SLIDER('[max]="10" [step]="3"'), (testHost) =>
        testHost.value.set(3),
      );
      await settle(fixture);
      press(thumbOf(root), 'End');
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.emitted).toEqual([9]);
    });

    it('stops at the limits, still handles the key, and reports nothing', async () => {
      const { fixture, host, root } = mount(SLIDER(), (testHost) => testHost.value.set(100));
      await settle(fixture);
      for (const key of ['ArrowRight', 'ArrowUp', 'PageUp', 'End']) {
        expect(press(thumbOf(root), key).defaultPrevented, key).toBe(true);
      }
      expect(host.emitted).toEqual([]);
      host.value.set(0);
      await settle(fixture);
      for (const key of ['ArrowLeft', 'ArrowDown', 'PageDown', 'Home']) {
        expect(press(thumbOf(root), key).defaultPrevented, key).toBe(true);
      }
      expect(host.emitted).toEqual([]);
    });

    it('counts a decimal step without drift', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [step]="0.1" [(value)]="value" (valueChange)="emitted.push($event)" />`,
        (testHost) => testHost.value.set(0.2),
      );
      await settle(fixture);
      for (let count = 0; count < 4; count++) {
        press(thumbOf(root), 'ArrowRight');
      }
      await settle(fixture);
      expect(host.emitted).toEqual([0.3, 0.4, 0.5, 0.6]);
    });

    it('stays exact with a negative decimal min', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [min]="-0.3" [max]="0.3" [step]="0.1" [(value)]="value" (valueChange)="emitted.push($event)" />`,
        (testHost) => testHost.value.set(-0.3),
      );
      await settle(fixture);
      for (let count = 0; count < 7; count++) {
        press(thumbOf(root), 'ArrowRight');
      }
      await settle(fixture);
      expect(host.emitted).toEqual([-0.2, -0.1, 0, 0.1, 0.2, 0.3]);
      expect(host.emitted.some((value) => Object.is(value, -0))).toBe(false);
    });

    it('stays exact with large numbers', async () => {
      const large = mount(
        `<ck-slider aria-label="A" [min]="0" [max]="1000000000000" [step]="1000" [(value)]="value" (valueChange)="emitted.push($event)" />`,
        (testHost) => testHost.value.set(123456789000),
      );
      await settle(large.fixture);
      press(thumbOf(large.root), 'ArrowRight');
      await settle(large.fixture);
      expect(large.host.emitted).toEqual([123456790000]);
    });

    it('survives a thousand quick key presses and ends at the limit', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [(value)]="value" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      for (let count = 0; count < 1000; count++) {
        press(thumbOf(root), 'ArrowRight');
      }
      await settle(fixture);
      expect(host.value()).toBe(100);
      expect(host.emitted).toHaveLength(50);
    });

    it('starts from min with no value: right moves one step, left writes min', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [min]="-10" [value]="null" (valueChange)="emitted.push($event)" />
         <ck-slider aria-label="B" [min]="-10" [value]="null" (valueChange)="emitted.push($event)" />
         <ck-slider aria-label="C" [min]="-10" [value]="null" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      press(thumbOf(root, 0), 'ArrowRight');
      press(thumbOf(root, 1), 'ArrowLeft');
      press(thumbOf(root, 2), 'End');
      await settle(fixture);
      expect(host.emitted).toEqual([-9, -10, 100]);
    });

    it('does not move when min is above max', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host, root } = mount(SLIDER('[min]="5" [max]="1"'), (testHost) =>
        testHost.value.set(5),
      );
      await settle(fixture);
      for (const key of ['ArrowRight', 'PageUp', 'End', 'Home', 'ArrowLeft']) {
        press(thumbOf(root), key);
      }
      await settle(fixture);
      expect(host.emitted).toEqual([]);
    });
  });

  describe('right-to-left text', () => {
    const rtl = (attributes = '') => `<div dir="rtl">${SLIDER(attributes)}</div>`;

    it('swaps Left and Right, as the track runs from the right', async () => {
      const { fixture, host, root } = mount(rtl());
      await settle(fixture);
      press(thumbOf(root), 'ArrowLeft');
      press(thumbOf(root), 'ArrowLeft');
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.emitted).toEqual([51, 52, 51]);
    });

    it('leaves Up, Down, the pages, Home and End alone', async () => {
      const { fixture, host, root } = mount(rtl());
      await settle(fixture);
      for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']) {
        press(thumbOf(root), key);
      }
      await settle(fixture);
      expect(host.emitted).toEqual([51, 50, 60, 50, 0, 100]);
    });

    it('puts min at the right edge and max at the left', async () => {
      const { fixture, root } = mount(rtl(), (host) => host.value.set(0));
      await settle(fixture);
      const rail = root.querySelector('.ck-slider__rail')!.getBoundingClientRect();
      const thumb = thumbOf(root).getBoundingClientRect();
      expect(thumb.left + thumb.width / 2).toBeCloseTo(rail.right - 1, 0);
    });

    it('is left-to-right again once the direction is removed', async () => {
      const { fixture, host, root } = mount(rtl());
      await settle(fixture);
      root.querySelector('div')!.removeAttribute('dir');
      press(thumbOf(root), 'ArrowRight');
      await settle(fixture);
      expect(host.emitted).toEqual([51]);
    });
  });

  describe('keys it must leave alone', () => {
    it.each([
      ['Control', { ctrlKey: true }],
      ['Meta', { metaKey: true }],
      ['Alt', { altKey: true }],
    ])('ignores every key with %s held', async (_name, modifier) => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      for (const key of [
        'ArrowRight',
        'ArrowLeft',
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'Home',
        'End',
      ]) {
        expect(press(thumbOf(root), key, modifier).defaultPrevented, key).toBe(false);
      }
      await settle(fixture);
      expect(host.emitted).toEqual([]);
    });

    it('still moves with Shift held', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight', { shiftKey: true });
      await settle(fixture);
      expect(host.emitted).toEqual([51]);
    });

    it('does not swallow other keys', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      for (const key of ['a', '5', 'Tab', 'Enter', ' ', 'Escape', 'Backspace']) {
        expect(press(thumbOf(root), key).defaultPrevented, key).toBe(false);
      }
      expect(host.emitted).toEqual([]);
    });

    it('does nothing while disabled, by input and by an ancestor fieldset', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" disabled [value]="50" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" />
         <fieldset [disabled]="locked()"><ck-slider aria-label="B" [value]="50" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" /></fieldset>`,
        (testHost) => testHost.locked.set(true),
      );
      await settle(fixture);
      for (const index of [0, 1]) {
        for (const key of ['ArrowRight', 'Home', 'End', 'PageUp']) {
          expect(press(thumbOf(root, index), key).defaultPrevented, key).toBe(false);
          press(thumbOf(root, index), key, {}, 'keyup');
        }
      }
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      expect(host.commits).toEqual([]);
      host.locked.set(false);
      await settle(fixture);
      press(thumbOf(root, 1), 'ArrowRight');
      expect(host.emitted).toEqual([51]);
    });
  });

  describe('valueCommit from the keyboard', () => {
    it('fires once, with the final value, when the key is released', async () => {
      const { fixture, host, root } = mount(SLIDER());
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      expect(host.commits).toEqual([]);
      press(thumbOf(root), 'ArrowRight', {}, 'keyup');
      await settle(fixture);
      expect(host.commits).toEqual([51]);
      expect(host.emitted).toEqual([51]);
    });

    it('fires once for a held key with auto-repeat, not once per repeat', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [(value)]="value" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" />`,
      );
      await settle(fixture);
      tap(thumbOf(root), 'ArrowRight', 5);
      await settle(fixture);
      expect(host.emitted).toHaveLength(6);
      expect(host.commits).toEqual([56]);
    });

    it('fires for pages, Home and End as well', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [(value)]="value" (valueChange)="emitted.push($event)" (valueCommit)="commits.push($event)" />`,
      );
      await settle(fixture);
      for (const key of ['PageUp', 'End', 'Home']) {
        tap(thumbOf(root), key);
      }
      expect(host.commits).toEqual([60, 100, 0]);
    });

    it('does not fire when the key changed nothing', async () => {
      const { fixture, host, root } = mount(SLIDER(), (testHost) => testHost.value.set(100));
      await settle(fixture);
      tap(thumbOf(root), 'ArrowRight', 3);
      tap(thumbOf(root), 'End');
      await settle(fixture);
      expect(host.commits).toEqual([]);
    });

    it('does not fire when the change ends where it started', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [(value)]="value" (valueCommit)="commits.push($event)" />`,
      );
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      press(thumbOf(root), 'ArrowLeft');
      press(thumbOf(root), 'ArrowLeft', {}, 'keyup');
      expect(host.value()).toBe(50);
      expect(host.commits).toEqual([]);
    });

    it('fires when focus leaves while the key is still down, and not again on its release', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [(value)]="value" (valueCommit)="commits.push($event)" />
         <button id="after">After</button>`,
      );
      await settle(fixture);
      thumbOf(root).focus();
      press(thumbOf(root), 'ArrowRight');
      press(thumbOf(root), 'ArrowRight', { repeat: true });
      expect(host.commits).toEqual([]);
      root.querySelector<HTMLElement>('#after')!.focus();
      expect(host.commits).toEqual([52]);
      press(thumbOf(root), 'ArrowRight', {}, 'keyup');
      expect(host.commits).toEqual([52]);
    });

    it('starts a new change for the next key press', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [(value)]="value" (valueCommit)="commits.push($event)" />`,
      );
      await settle(fixture);
      tap(thumbOf(root), 'ArrowRight');
      tap(thumbOf(root), 'ArrowRight');
      tap(thumbOf(root), 'ArrowLeft');
      expect(host.commits).toEqual([51, 52, 51]);
    });

    it('ignores the release of a key that is not a slider key, and a release with no press', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [(value)]="value" (valueCommit)="commits.push($event)" />`,
      );
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight', {}, 'keyup');
      press(thumbOf(root), 'ArrowRight');
      press(thumbOf(root), 'Shift', {}, 'keyup');
      expect(host.commits).toEqual([]);
      press(thumbOf(root), 'ArrowRight', {}, 'keyup');
      expect(host.commits).toEqual([51]);
    });

    it('ends the change when the slider gets disabled, once', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [disabled]="locked()" [(value)]="value" (valueCommit)="commits.push($event)" />`,
      );
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      host.locked.set(true);
      await settle(fixture);
      expect(host.commits).toEqual([51]);
      press(thumbOf(root), 'ArrowRight', {}, 'keyup');
      expect(host.commits).toEqual([51]);
    });

    it('does not fire when destroyed with a key down', async () => {
      const { fixture, host, root } = mount(
        `<ck-slider aria-label="A" [(value)]="value" (valueCommit)="commits.push($event)" />`,
      );
      await settle(fixture);
      press(thumbOf(root), 'ArrowRight');
      const thumb = thumbOf(root);
      fixture.destroy();
      press(thumb, 'ArrowRight', {}, 'keyup');
      expect(host.commits).toEqual([]);
    });

    it('never fires for a value the form writes', async () => {
      const { fixture, host } = mount(
        `<ck-slider aria-label="A" [formControl]="control" (valueCommit)="commits.push($event)" />`,
      );
      await settle(fixture);
      host.control.setValue(70);
      host.control.reset();
      host.control.setValue(5, { emitEvent: false });
      await settle(fixture);
      expect(host.commits).toEqual([]);
    });

    it('never fires for a value the binding writes', async () => {
      const bound = mount(SLIDER());
      await settle(bound.fixture);
      bound.host.value.set(10);
      await settle(bound.fixture);
      bound.host.value.set(null);
      await settle(bound.fixture);
      expect(bound.host.commits).toEqual([]);
    });

    it('fires for a value that is clamped when the key moves a value from outside the range', async () => {
      const { fixture, host, root } = mount(SLIDER('[max]="10"'), (testHost) =>
        testHost.value.set(50),
      );
      await settle(fixture);
      tap(thumbOf(root), 'ArrowLeft');
      expect(host.commits).toEqual([9]);
    });
  });
});
