import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { userEvent } from 'vitest/browser';
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

const STEPPER = (attributes = '') =>
  `<button id="before">Before</button><ck-stepper aria-label="FTP" ${attributes} [value]="value()" (valueChange)="value.set($event); emitted.push($event)" /><button id="after">After</button>`;

describe('CkStepper keyboard and focus', () => {
  afterEach(() => {
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  describe('keys', () => {
    it('moves by one step with Arrow Up and Arrow Down, and keeps the key from scrolling', async () => {
      const { fixture, host, root } = mount(STEPPER('[step]="5"'));
      await settle(fixture);
      expect(press(inputOf(root), 'ArrowUp').defaultPrevented).toBe(true);
      expect(press(inputOf(root), 'ArrowDown').defaultPrevented).toBe(true);
      press(inputOf(root), 'ArrowDown');
      await settle(fixture);
      expect(host.emitted).toEqual([255, 250, 245]);
      expect(inputOf(root).value).toBe('245');
    });

    it('moves by ten steps with Page Up and Page Down, or by largeStep', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="A" [step]="5" [value]="100" (valueChange)="emitted.push($event)" />
         <ck-stepper aria-label="B" [step]="5" [largeStep]="25" [value]="100" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      press(inputOf(root, 0), 'PageUp');
      press(inputOf(root, 1), 'PageUp');
      await settle(fixture);
      expect(host.emitted).toEqual([150, 125]);
      press(inputOf(root, 0), 'PageDown');
      press(inputOf(root, 0), 'PageDown');
      await settle(fixture);
      expect(host.emitted).toEqual([150, 125, 100, 50]);
    });

    it('jumps to the limits with Home and End, and leaves them to the caret without limits', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="A" [min]="50" [max]="600" [value]="250" (valueChange)="emitted.push($event)" />
         <ck-stepper aria-label="B" [value]="250" (valueChange)="emitted.push($event)" />
         <ck-stepper aria-label="C" [min]="50" [value]="250" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      expect(press(inputOf(root, 0), 'Home').defaultPrevented).toBe(true);
      expect(press(inputOf(root, 0), 'End').defaultPrevented).toBe(true);
      expect(press(inputOf(root, 1), 'Home').defaultPrevented).toBe(false);
      expect(press(inputOf(root, 1), 'End').defaultPrevented).toBe(false);
      expect(press(inputOf(root, 2), 'End').defaultPrevented).toBe(false);
      await settle(fixture);
      expect(host.emitted).toEqual([50, 600]);
    });

    it('snaps Home and End onto the grid when the limit is off it', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="A" [max]="103" [step]="5" [value]="50" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      press(inputOf(root), 'End');
      await settle(fixture);
      expect(host.emitted).toEqual([100]);
    });

    it('stops at the limits for the arrows and the page keys', async () => {
      const { fixture, host, root } = mount(
        STEPPER('[min]="0" [max]="20" [step]="5"'),
        (testHost) => testHost.value.set(15),
      );
      await settle(fixture);
      press(inputOf(root), 'PageUp');
      press(inputOf(root), 'ArrowUp');
      press(inputOf(root), 'PageDown');
      press(inputOf(root), 'PageDown');
      press(inputOf(root), 'ArrowDown');
      await settle(fixture);
      expect(host.emitted).toEqual([20, 0]);
    });

    it('starts from the minimum, else 0, on the first arrow with no value', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="A" [min]="40" [value]="null" (valueChange)="emitted.push($event)" />
         <ck-stepper aria-label="B" [value]="null" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      press(inputOf(root, 0), 'ArrowDown');
      press(inputOf(root, 1), 'ArrowUp');
      await settle(fixture);
      expect(host.emitted).toEqual([40, 0]);
    });

    it.each([
      ['Control', { ctrlKey: true }],
      ['Meta', { metaKey: true }],
      ['Alt', { altKey: true }],
    ])(
      'ignores every key with %s held, as the browser or the page has its own use',
      async (_name, modifier) => {
        const { fixture, host, root } = mount(STEPPER('[min]="0" [max]="500"'));
        await settle(fixture);
        for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']) {
          expect(press(inputOf(root), key, modifier).defaultPrevented, key).toBe(false);
        }
        typeInto(inputOf(root), '300');
        expect(press(inputOf(root), 'Enter', modifier).defaultPrevented).toBe(false);
        await settle(fixture);
        expect(host.emitted).toEqual([]);
        expect(inputOf(root).value).toBe('300');
      },
    );

    it('still moves with Shift held, which only selects text elsewhere', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      press(inputOf(root), 'ArrowUp', { shiftKey: true });
      await settle(fixture);
      expect(host.emitted).toEqual([251]);
    });

    it('ignores other keys and does not swallow them', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      for (const key of ['a', '5', 'Tab', 'ArrowLeft', 'ArrowRight', 'Escape', ' ']) {
        expect(press(inputOf(root), key).defaultPrevented, key).toBe(false);
      }
      expect(host.emitted).toEqual([]);
    });

    it('does nothing for the keys while read-only or disabled', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="A" readonly [value]="5" (valueChange)="emitted.push($event)" />
         <ck-stepper aria-label="B" disabled [value]="5" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      for (const index of [0, 1]) {
        for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'Home']) {
          press(inputOf(root, index), key);
        }
      }
      expect(host.emitted).toEqual([]);
    });
  });

  describe('typed text', () => {
    it('acts on the parsed draft: type 100, press Arrow Up, get 101', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      typeInto(inputOf(root), '100');
      press(inputOf(root), 'ArrowUp');
      await settle(fixture);
      expect(host.emitted).toEqual([101]);
      expect(inputOf(root).value).toBe('101');
    });

    it('snaps the draft first, so 252 with a step of 5 and Arrow Up gives 255', async () => {
      const { fixture, host, root } = mount(STEPPER('[step]="5"'));
      await settle(fixture);
      typeInto(inputOf(root), '252');
      press(inputOf(root), 'ArrowUp');
      await settle(fixture);
      expect(host.emitted).toEqual([255]);
    });

    it('uses the last value when the draft is not a number, and starts again from an empty draft', async () => {
      const { fixture, host, root } = mount(STEPPER('[min]="10"'));
      await settle(fixture);
      typeInto(inputOf(root), 'abc');
      press(inputOf(root), 'ArrowUp');
      await settle(fixture);
      expect(host.emitted).toEqual([251]);
      typeInto(inputOf(root), '');
      press(inputOf(root), 'ArrowUp');
      await settle(fixture);
      expect(host.emitted).toEqual([251, 10]);
    });

    it('commits the draft on Enter without preventing the form submit', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      typeInto(inputOf(root), '260');
      expect(press(inputOf(root), 'Enter').defaultPrevented).toBe(false);
      await settle(fixture);
      expect(host.emitted).toEqual([260]);
    });
  });

  describe('focus', () => {
    it('is one tab stop: Tab goes into the input and past the buttons', async () => {
      const { fixture, root } = mount(STEPPER());
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(inputOf(root));
      await userEvent.tab();
      expect(document.activeElement).toBe(query(root, '#after'));
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(inputOf(root));
    });

    it('keeps focus in the input when a button is clicked, so the arrows work right after', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      inputOf(root).focus();
      await userEvent.click(plusOf(root));
      await settle(fixture);
      expect(document.activeElement).toBe(inputOf(root));
      await userEvent.keyboard('{ArrowUp}');
      await settle(fixture);
      expect(host.emitted).toEqual([251, 252]);
    });

    it('moves focus into the input when a button is clicked from elsewhere (fine pointer)', async () => {
      const { fixture, root } = mount(STEPPER());
      await settle(fixture);
      query(root, '#before').focus();
      await userEvent.click(minusOf(root));
      await settle(fixture);
      expect(document.activeElement).toBe(inputOf(root));
    });

    it('commits typed text when a button is pressed and steps from it', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      typeInto(inputOf(root), '300');
      await userEvent.click(plusOf(root));
      await settle(fixture);
      expect(host.emitted).toEqual([301]);
      expect(document.activeElement).toBe(inputOf(root));
    });

    it('focuses the input from a click on the unit, which does not take pointer events itself', async () => {
      const { fixture, root } = mount(STEPPER('unit="W"'));
      await settle(fixture);
      const unit = query(root, '.ck-stepper__unit').getBoundingClientRect();
      const field = query(root, '.ck-stepper__field');
      const box = field.getBoundingClientRect();
      const x = unit.left + unit.width / 2;
      const y = unit.top + unit.height / 2;
      // The click lands on the field, because the unit lets it through.
      expect(document.elementFromPoint(x, y)).toBe(field);
      query(root, '#before').focus();
      await userEvent.click(field, { position: { x: x - box.left, y: y - box.top } });
      expect(document.activeElement).toBe(inputOf(root));
    });

    it('does not focus the input from a click on the unit while disabled', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="A" unit="W" disabled [value]="5" />`,
      );
      await settle(fixture);
      const field = query(root, '.ck-stepper__field');
      field.click();
      expect(document.activeElement).not.toBe(inputOf(root));
    });

    it('stays focusable while read-only, and cannot be focused while disabled', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="A" readonly [value]="5" /><ck-stepper aria-label="B" disabled [value]="5" />`,
      );
      await settle(fixture);
      inputOf(root, 1).focus();
      expect(document.activeElement).not.toBe(inputOf(root, 1));
      inputOf(root, 0).focus();
      expect(document.activeElement).toBe(inputOf(root, 0));
      expect(inputOf(root, 1).disabled).toBe(true);
    });

    it('commits the text and marks the control touched only when focus leaves the whole control', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      const touched = vi.fn();
      const stepper = fixture.debugElement.query((debug) => debug.name === 'ck-stepper')
        .componentInstance as { registerOnTouched(callback: () => void): void };
      stepper.registerOnTouched(touched);
      inputOf(root).focus();
      typeInto(inputOf(root), '280');
      expect(touched).not.toHaveBeenCalled();
      query(root, '#after').focus();
      await settle(fixture);
      expect(touched).toHaveBeenCalledTimes(1);
      expect(host.emitted).toEqual([280]);
    });
  });
});
