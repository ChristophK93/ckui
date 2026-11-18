import { ApplicationRef, LOCALE_ID, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { vi } from 'vitest';
import { expectNoAxeViolations } from '../testing/axe';
import {
  DARK_TOKENS,
  TOKENS,
  inputOf,
  minusOf,
  mount,
  plusOf,
  press,
  query,
  settle,
  StepperHost,
  typeInto,
} from '../testing/stepper-host';

const STEPPER = (attributes = '') =>
  `<ck-stepper aria-label="FTP" ${attributes} [value]="value()" (valueChange)="emitted.push($event)" />`;

describe('CkStepper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    TestBed.resetTestingModule();
  });

  describe('structure', () => {
    it('is one spinbutton input named by the consumer, with the name moved off the host', async () => {
      const { fixture, root } = mount(STEPPER());
      await settle(fixture);
      const input = inputOf(root);
      expect(input.getAttribute('role')).toBe('spinbutton');
      expect(input.type).toBe('text');
      expect(input.getAttribute('inputmode')).toBe('decimal');
      expect(input.getAttribute('aria-label')).toBe('FTP');
      expect(query(root, 'ck-stepper').hasAttribute('aria-label')).toBe(false);
      expect(input.value).toBe('250');
    });

    it('names the input through aria-labelledby and through a wrapping label', async () => {
      const { fixture, root } = mount(
        `<span id="caption">Target</span><ck-stepper aria-labelledby="caption" [value]="value()" />
         <label>Resistance <ck-stepper [value]="value()" /></label>`,
      );
      await settle(fixture);
      expect(inputOf(root, 0).getAttribute('aria-labelledby')).toBe('caption');
      expect(query(root, 'ck-stepper').hasAttribute('aria-labelledby')).toBe(false);
      expect(inputOf(root, 1).labels?.[0]?.textContent).toContain('Resistance');
    });

    it('keeps the minus and plus buttons out of the tab order, labelled from the labels token', async () => {
      const { fixture, root } = mount(STEPPER());
      await settle(fixture);
      for (const button of [minusOf(root), plusOf(root)]) {
        expect(button.tabIndex).toBe(-1);
        expect(button.type).toBe('button');
      }
      expect(minusOf(root).getAttribute('aria-label')).toBe('Decrease');
      expect(plusOf(root).getAttribute('aria-label')).toBe('Increase');
    });

    it('lets each instance name its buttons, and falls back when the label is emptied', async () => {
      const { fixture, host, root } = mount(
        STEPPER('[decrementLabel]="label()" [incrementLabel]="label()" [step]="5"'),
      );
      await settle(fixture);
      expect(minusOf(root).getAttribute('aria-label')).toBe('FTP minus 5');
      expect(plusOf(root).getAttribute('aria-label')).toBe('FTP minus 5');
      host.label.set('');
      await settle(fixture);
      expect(minusOf(root).getAttribute('aria-label')).toBe('Decrease');
      expect(plusOf(root).getAttribute('aria-label')).toBe('Increase');
      host.label.set('FTP plus 5');
      await settle(fixture);
      expect(minusOf(root).getAttribute('aria-label')).toBe('FTP plus 5');
    });

    it('moves aria-describedby from the host to the input, static or bound', async () => {
      const { fixture, host, root } = mount(
        `<span id="hint">Between 50 and 600</span><span id="error">Too low</span>
         <ck-stepper aria-label="A" aria-describedby="hint" [value]="1" />
         <ck-stepper aria-label="B" [aria-describedby]="describedBy()" [value]="1" />
         <ck-stepper aria-label="C" [value]="1" />`,
      );
      await settle(fixture);
      for (const stepper of root.querySelectorAll('ck-stepper')) {
        expect(stepper.hasAttribute('aria-describedby')).toBe(false);
      }
      expect(inputOf(root, 0).getAttribute('aria-describedby')).toBe('hint');
      expect(inputOf(root, 1).getAttribute('aria-describedby')).toBe('hint');
      expect(inputOf(root, 2).hasAttribute('aria-describedby')).toBe(false);
      host.describedBy.set('hint error');
      await settle(fixture);
      expect(inputOf(root, 1).getAttribute('aria-describedby')).toBe('hint error');
      host.describedBy.set(null);
      await settle(fixture);
      expect(inputOf(root, 1).hasAttribute('aria-describedby')).toBe(false);
    });

    it('sets inputmode to text where the range allows a minus sign, decimal otherwise', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="A" [min]="-5" [value]="0" />
         <ck-stepper aria-label="B" [min]="0" [value]="0" />
         <ck-stepper aria-label="C" [min]="-0.5" [step]="0.5" [value]="0" />
         <ck-stepper aria-label="D" [value]="0" />`,
      );
      await settle(fixture);
      expect([0, 1, 2, 3].map((index) => inputOf(root, index).getAttribute('inputmode'))).toEqual([
        'text',
        'decimal',
        'text',
        'decimal',
      ]);
    });

    it('reports the value, the limits and the unit to assistive technology', async () => {
      const { fixture, root } = mount(STEPPER('unit="W" [min]="50" [max]="600"'));
      await settle(fixture);
      const input = inputOf(root);
      expect(input.getAttribute('aria-valuenow')).toBe('250');
      expect(input.getAttribute('aria-valuemin')).toBe('50');
      expect(input.getAttribute('aria-valuemax')).toBe('600');
      expect(input.getAttribute('aria-valuetext')).toBe('250 W');
      expect(query(root, '.ck-stepper__unit').getAttribute('aria-hidden')).toBe('true');
    });

    it('has no aria-valuenow and no value text while the value is null, and no limits when unset', async () => {
      const { fixture, root } = mount(STEPPER('unit="W"'), (host) => host.value.set(null));
      await settle(fixture);
      const input = inputOf(root);
      expect(input.value).toBe('');
      expect(input.hasAttribute('aria-valuenow')).toBe(false);
      expect(input.hasAttribute('aria-valuetext')).toBe(false);
      expect(input.hasAttribute('aria-valuemin')).toBe(false);
      expect(input.hasAttribute('aria-valuemax')).toBe(false);
    });

    it.each([
      ['a string', `'250'`],
      ['NaN', 'NaN'],
      ['Infinity', 'Infinity'],
      ['undefined', 'undefined'],
    ])('shows an empty field for %s', async (_name, expression) => {
      const { fixture, root } = mount(`<ck-stepper aria-label="FTP" [value]="${expression}" />`);
      await settle(fixture);
      expect(inputOf(root).value).toBe('');
      expect(inputOf(root).hasAttribute('aria-valuenow')).toBe(false);
    });

    it('uses the size from provideCkui and the size input over it', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'lg' })] });
      const { fixture, root } = mount(
        `<ck-stepper aria-label="A" [value]="1" /><ck-stepper aria-label="B" size="xl" [value]="1" />`,
      );
      await settle(fixture);
      const steppers = root.querySelectorAll('ck-stepper');
      expect(steppers[0].classList.contains('ck-stepper--lg')).toBe(true);
      expect(steppers[1].classList.contains('ck-stepper--xl')).toBe(true);
    });
  });

  describe('buttons', () => {
    it('steps by one on a click without a pointer, once, and reports one change', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      plusOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([251]);
      expect(inputOf(root).value).toBe('251');
      minusOf(root).click();
      minusOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([251, 250, 249]);
      expect(inputOf(root).value).toBe('249');
    });

    it('disables a button at its bound and stops there', async () => {
      const { fixture, host, root } = mount(STEPPER('[min]="249" [max]="251"'));
      await settle(fixture);
      plusOf(root).click();
      await settle(fixture);
      expect(plusOf(root).disabled).toBe(true);
      expect(minusOf(root).disabled).toBe(false);
      plusOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([251]);
      minusOf(root).click();
      minusOf(root).click();
      await settle(fixture);
      expect(minusOf(root).disabled).toBe(true);
      expect(inputOf(root).value).toBe('249');
    });

    it('starts from the minimum, else from 0, when the value is null', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="A" [min]="40" [value]="null" (valueChange)="emitted.push($event)" />
         <ck-stepper aria-label="B" [value]="null" (valueChange)="emitted.push($event)" />
         <ck-stepper aria-label="C" [value]="null" [max]="-5" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      plusOf(root, 0).click();
      minusOf(root, 1).click();
      plusOf(root, 2).click();
      await settle(fixture);
      expect(host.emitted).toEqual([40, 0, -5]);
    });

    it('does nothing when disabled or read-only', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="A" [value]="value()" disabled (valueChange)="emitted.push($event)" />
         <ck-stepper aria-label="B" [value]="value()" readonly (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      for (const index of [0, 1]) {
        expect(plusOf(root, index).disabled).toBe(true);
        expect(minusOf(root, index).disabled).toBe(true);
        plusOf(root, index).click();
      }
      expect(host.emitted).toEqual([]);
      expect(inputOf(root, 0).disabled).toBe(true);
      expect(inputOf(root, 1).disabled).toBe(false);
      expect(inputOf(root, 1).readOnly).toBe(true);
      expect(inputOf(root, 1).getAttribute('aria-readonly')).toBe('true');
    });
  });

  describe('typing', () => {
    it('commits on Enter and on blur, and only once per change', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      const input = inputOf(root);
      typeInto(input, '300');
      expect(host.emitted).toEqual([]);
      press(input, 'Enter');
      await settle(fixture);
      expect(host.emitted).toEqual([300]);
      press(input, 'Enter');
      input.blur();
      await settle(fixture);
      expect(host.emitted).toEqual([300]);
      typeInto(input, '310');
      input.blur();
      await settle(fixture);
      expect(host.emitted).toEqual([300, 310]);
      expect(input.getAttribute('aria-valuenow')).toBe('310');
    });

    it('snaps to the step from the minimum and clamps to the limits', async () => {
      const { fixture, host, root } = mount(STEPPER('[min]="50" [max]="600" [step]="5"'));
      await settle(fixture);
      const input = inputOf(root);
      for (const [typed, expected] of [
        ['252', '250'],
        ['253', '255'],
        ['9999', '600'],
        ['-40', '50'],
        ['0', '50'],
        ['603', '600'],
      ] as const) {
        typeInto(input, typed);
        press(input, 'Enter');
        await settle(fixture);
        expect(input.value, typed).toBe(expected);
      }
      expect(host.emitted.at(-1)).toBe(600);
    });

    it('snaps relative to the minimum when it is not a multiple of the step', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="FTP" [min]="52" [max]="102" [step]="5" [value]="62" />`,
      );
      await settle(fixture);
      const input = inputOf(root);
      typeInto(input, '80');
      press(input, 'Enter');
      await settle(fixture);
      expect(input.value).toBe('82');
      typeInto(input, '500');
      press(input, 'Enter');
      await settle(fixture);
      expect(input.value).toBe('102');
      typeInto(input, '101');
      press(input, 'Enter');
      await settle(fixture);
      expect(input.value).toBe('102');
    });

    it('does not end above a maximum that is off the grid', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="FTP" [max]="103" [step]="5" [value]="100" />`,
      );
      await settle(fixture);
      const input = inputOf(root);
      typeInto(input, '999');
      press(input, 'Enter');
      await settle(fixture);
      expect(input.value).toBe('100');
    });

    it.each([['abc'], ['12abc'], ['1e5'], ['--5'], ['-'], ['1.2.3'], ['5 5 5x'], ['0x10']])(
      'reverts the text "%s" and emits nothing',
      async (typed) => {
        const { fixture, host, root } = mount(STEPPER());
        await settle(fixture);
        const input = inputOf(root);
        typeInto(input, typed);
        press(input, 'Enter');
        await settle(fixture);
        expect(input.value).toBe('250');
        expect(host.emitted).toEqual([]);
      },
    );

    it('reverts a number too large to be meant', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      const input = inputOf(root);
      for (const typed of ['9'.repeat(400), '1000000000000000000']) {
        typeInto(input, typed);
        input.blur();
        await settle(fixture);
        expect(input.value).toBe('250');
      }
      expect(host.emitted).toEqual([]);
    });

    it('keeps a large number inside the limits', async () => {
      const { fixture, root } = mount(STEPPER('[max]="600"'));
      await settle(fixture);
      const input = inputOf(root);
      typeInto(input, '999999999999');
      press(input, 'Enter');
      await settle(fixture);
      expect(input.value).toBe('600');
    });

    it('turns an empty field into null, and then has no value to read', async () => {
      const { fixture, host, root } = mount(STEPPER('unit="W"'));
      await settle(fixture);
      const input = inputOf(root);
      typeInto(input, '   ');
      press(input, 'Enter');
      await settle(fixture);
      expect(host.emitted).toEqual([null]);
      expect(input.value).toBe('');
      expect(input.hasAttribute('aria-valuenow')).toBe(false);
      expect(input.hasAttribute('aria-valuetext')).toBe(false);
    });

    it('does not report a change when an already empty field is emptied again', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="A" [value]="undefined" (valueChange)="emitted.push($event)" />
         <ck-stepper aria-label="B" [value]="null" (valueChange)="emitted.push($event)" />
         <ck-stepper aria-label="C" [value]="'abc'" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      for (const index of [0, 1, 2]) {
        typeInto(inputOf(root, index), '  ');
        press(inputOf(root, index), 'Enter');
        inputOf(root, index).blur();
      }
      await settle(fixture);
      expect(host.emitted).toEqual([]);
      for (const index of [0, 1, 2]) {
        expect(inputOf(root, index).value).toBe('');
      }
    });

    it('still reports the first real value after an empty start', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="A" [value]="undefined" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      typeInto(inputOf(root), '7');
      press(inputOf(root), 'Enter');
      await settle(fixture);
      expect(host.emitted).toEqual([7]);
    });

    it('keeps typed text across focus leaving and coming back, and commits it once', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      const input = inputOf(root);
      input.focus();
      typeInto(input, '410');
      input.blur();
      await settle(fixture);
      expect(host.emitted).toEqual([410]);
      input.focus();
      typeInto(input, '9');
      expect(input.value).toBe('9');
      input.blur();
      input.focus();
      expect(input.value).toBe('9');
      input.blur();
      await settle(fixture);
      expect(host.emitted).toEqual([410, 9]);
    });

    it('keeps a draft typed right after a commit, before the commit has rendered', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      const input = inputOf(root);
      typeInto(input, '300');
      press(input, 'Enter');
      // No render in between: the value is 300 and shown, the next draft is 400.
      typeInto(input, '400');
      await settle(fixture);
      expect(input.value).toBe('400');
      input.blur();
      await settle(fixture);
      expect(host.emitted).toEqual([300, 400]);
      expect(input.value).toBe('400');
    });

    it('accepts a negative number and writes it back without -0', async () => {
      const { fixture, host, root } = mount(STEPPER('[min]="-100"'));
      await settle(fixture);
      const input = inputOf(root);
      typeInto(input, '-12');
      press(input, 'Enter');
      await settle(fixture);
      expect(input.value).toBe('-12');
      typeInto(input, '-0.2');
      press(input, 'Enter');
      await settle(fixture);
      expect(host.emitted.at(-1)).toBe(0);
      expect(Object.is(host.emitted.at(-1), 0)).toBe(true);
      expect(input.value).toBe('0');
    });

    it('accepts a unicode minus sign', async () => {
      const { fixture, root } = mount(STEPPER('[min]="-100"'));
      await settle(fixture);
      typeInto(inputOf(root), '−15');
      press(inputOf(root), 'Enter');
      await settle(fixture);
      expect(inputOf(root).value).toBe('-15');
    });

    it('does not take typing while read-only, and ignores Enter there', async () => {
      const { fixture, host, root } = mount(STEPPER('readonly'));
      await settle(fixture);
      const input = inputOf(root);
      input.value = '999';
      press(input, 'Enter');
      await settle(fixture);
      expect(host.emitted).toEqual([]);
    });

    it('drops unsaved typing when the value is written from outside', async () => {
      const { fixture, host, root } = mount(STEPPER());
      await settle(fixture);
      const input = inputOf(root);
      typeInto(input, '123');
      host.value.set(300);
      await settle(fixture);
      expect(input.value).toBe('300');
      input.blur();
      await settle(fixture);
      expect(host.emitted).toEqual([]);
    });
  });

  describe('numbers', () => {
    it('adds 0.1 and 0.2 to 0.3 and shows the fraction digits of the step', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="Ratio" [step]="0.1" [value]="value()" (valueChange)="emitted.push($event)" />`,
        (testHost) => testHost.value.set(0.2),
      );
      await settle(fixture);
      expect(inputOf(root).value).toBe('0.2');
      plusOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([0.3]);
      expect(inputOf(root).value).toBe('0.3');
      minusOf(root).click();
      minusOf(root).click();
      minusOf(root).click();
      await settle(fixture);
      expect(host.emitted.at(-1)).toBe(0);
      expect(Object.is(host.emitted.at(-1), 0)).toBe(true);
    });

    it('counts a step of 0.5 from the minimum and keeps one decimal', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="Grade" [min]="-5" [max]="5" [step]="0.5" [value]="0" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      expect(inputOf(root).value).toBe('0.0');
      plusOf(root).click();
      await settle(fixture);
      expect(inputOf(root).value).toBe('0.5');
      typeInto(inputOf(root), '2.3');
      press(inputOf(root), 'Enter');
      await settle(fixture);
      expect(host.emitted).toEqual([0.5, 2.5]);
    });

    it('shows a value that is more precise than the step instead of hiding digits', async () => {
      const { fixture, root } = mount(STEPPER(), (host) => host.value.set(250.25));
      await settle(fixture);
      expect(inputOf(root).value).toBe('250.25');
      expect(inputOf(root).getAttribute('aria-valuetext')).toBe('250.25');
    });

    it('moves an off-grid value to the next grid point in the direction', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="FTP" [step]="5" [value]="252" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      plusOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([255]);
      host.emitted.length = 0;
      host.value.set(252);
      await settle(fixture);
      minusOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([250]);
    });

    it('formats with the locale and accepts both decimal marks', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="Grade" unit="%" [step]="0.5" [value]="4.5" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      const input = inputOf(root);
      expect(input.value).toBe('4,5');
      expect(input.getAttribute('aria-valuetext')).toBe('4,5 %');
      for (const [typed, expected] of [
        ['7,5', 7.5],
        ['6.5', 6.5],
        ['1.250', 1250],
        ['1.234,5', 1234.5],
        ['2,25', 2.5],
      ] as const) {
        typeInto(input, typed);
        press(input, 'Enter');
        await settle(fixture);
        expect(host.emitted.at(-1), typed).toBe(expected);
      }
    });

    it.each([
      ['ar-EG', '١٢٣٤٫٥', 1234.5],
      ['ar-EG', '٧', 7],
      ['fa', '۱۲۳٫۵', 123.5],
      ['fa', '۴٬۵۰۰', 4500],
    ])('reads the native digits of %s: "%s"', async (locale, typed, expected) => {
      TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: locale }] });
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="X" [step]="0.5" [value]="5" (valueChange)="emitted.push($event)" />`,
        undefined,
      );
      await settle(fixture);
      const input = inputOf(root);
      // The display keeps the locale's own digits.
      expect(input.value).not.toMatch(/[0-9]/);
      expect(input.value).not.toBe('');
      typeInto(input, typed);
      press(input, 'Enter');
      await settle(fixture);
      expect(host.emitted.at(-1)).toBe(expected);
      expect(input.value).not.toMatch(/[0-9]/);
    });

    it('reads a negative native-digit number, and reverts a mix with a letter', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'ar-EG' }] });
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="X" [min]="-100" [value]="5" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      typeInto(inputOf(root), '-٣');
      press(inputOf(root), 'Enter');
      await settle(fixture);
      expect(host.emitted).toEqual([-3]);
      typeInto(inputOf(root), '٣x٤');
      press(inputOf(root), 'Enter');
      await settle(fixture);
      expect(host.emitted).toEqual([-3]);
    });

    it('treats a comma as the decimal mark in English when it cannot be a group', async () => {
      const { fixture, host, root } = mount(
        `<ck-stepper aria-label="Grade" [step]="0.1" [value]="1" (valueChange)="emitted.push($event)" />`,
      );
      await settle(fixture);
      for (const [typed, expected] of [
        ['2,5', 2.5],
        ['1,250', 1250],
      ] as const) {
        typeInto(inputOf(root), typed);
        press(inputOf(root), 'Enter');
        await settle(fixture);
        expect(host.emitted.at(-1), typed).toBe(expected);
      }
    });
  });

  describe('programmatic writes', () => {
    it('reformats the input without emitting a change', async () => {
      const { fixture, host, root } = mount(STEPPER('unit="W"'));
      await settle(fixture);
      host.value.set(310);
      await settle(fixture);
      expect(inputOf(root).value).toBe('310');
      expect(inputOf(root).getAttribute('aria-valuetext')).toBe('310 W');
      host.value.set(null);
      await settle(fixture);
      expect(inputOf(root).value).toBe('');
      expect(host.emitted).toEqual([]);
    });

    it('shows a value outside the limits as given and lets the buttons bring it back', async () => {
      const { fixture, host, root } = mount(STEPPER('[min]="50" [max]="600"'), (testHost) =>
        testHost.value.set(900),
      );
      await settle(fixture);
      expect(inputOf(root).value).toBe('900');
      expect(plusOf(root).disabled).toBe(true);
      minusOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([600]);
    });
  });

  describe('misconfiguration', () => {
    it('uses a step of 1 for 0, negative and non-numeric steps, and warns once', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      for (const step of ['0', '-5', "'abc'"]) {
        const { fixture, host, root } = mount(
          `<ck-stepper aria-label="FTP" [step]="${step}" [value]="10" (valueChange)="emitted.push($event)" />`,
        );
        await settle(fixture);
        plusOf(root).click();
        await settle(fixture);
        expect(host.emitted, step).toEqual([11]);
        fixture.destroy();
        document.body.replaceChildren();
        TestBed.resetTestingModule();
      }
      expect(warn.mock.calls.filter(([message]) => String(message).includes('step'))).toHaveLength(
        3,
      );
    });

    it('pins the value to the minimum when min is above max, and warns', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, host, root } = mount(STEPPER('[min]="100" [max]="50"'));
      await settle(fixture);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('min (100) is above max (50)'),
        expect.anything(),
      );
      // 250 is above the pinned bound, so plus is disabled and minus brings it back to min.
      expect(plusOf(root).disabled).toBe(true);
      plusOf(root).click();
      expect(host.emitted).toEqual([]);
      minusOf(root).click();
      await settle(fixture);
      expect(host.emitted).toEqual([100]);
      expect(plusOf(root).disabled).toBe(true);
      expect(minusOf(root).disabled).toBe(true);
      typeInto(inputOf(root), '70');
      press(inputOf(root), 'Enter');
      await settle(fixture);
      expect(inputOf(root).value).toBe('100');
    });

    it('treats a limit that is not a number as unset', async () => {
      const { fixture, root } = mount(STEPPER(`[min]="'x'" [max]="NaN"`));
      await settle(fixture);
      expect(inputOf(root).hasAttribute('aria-valuemin')).toBe(false);
      expect(inputOf(root).hasAttribute('aria-valuemax')).toBe(false);
    });

    it('accepts limits and step as plain attributes', async () => {
      const { fixture, root } = mount(
        `<ck-stepper aria-label="FTP" min="50" max="60" step="5" [value]="55" />`,
      );
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-valuemin')).toBe('50');
      plusOf(root).click();
      await settle(fixture);
      expect(inputOf(root).value).toBe('60');
      expect(plusOf(root).disabled).toBe(true);
    });

    it('warns without an accessible name, and not with a wrapping label', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture } = mount(`<ck-stepper [value]="1" />`);
      await settle(fixture);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no accessible name'),
        expect.anything(),
      );
      warn.mockClear();
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      const second = mount(`<label>Resistance <ck-stepper [value]="1" /></label>`);
      await settle(second.fixture);
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn when destroyed before the first render finishes', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      TestBed.overrideComponent(StepperHost, { set: { template: '<ck-stepper [value]="1" />' } });
      TestBed.createComponent(StepperHost).destroy();
      TestBed.inject(ApplicationRef).tick();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('server rendering', () => {
    it('renders the value into the markup and stays silent', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { fixture, root } = mount(STEPPER('unit="W"'));
      TestBed.inject(ApplicationRef).tick();
      expect(inputOf(root).getAttribute('value')).toBe('250');
      expect(query(root, 'ck-stepper').classList.contains('ck-stepper--md')).toBe(true);
      expect(warn).not.toHaveBeenCalled();
      fixture.destroy();
    });

    describe('taking over server markup', () => {
      /** The markup a server render leaves: the input exists with its written `value` attribute. */
      const serverMarkup = (root: HTMLElement, written: string): HTMLInputElement => {
        const input = inputOf(root);
        input.setAttribute('value', written);
        return input;
      };

      it('shows the current value over a stale server value, without a change', async () => {
        const { fixture, host, root } = mount(STEPPER(), undefined, (rendered) =>
          serverMarkup(rendered, '240'),
        );
        await settle(fixture);
        expect(inputOf(root).value).toBe('250');
        expect(inputOf(root).getAttribute('value')).toBe('250');
        expect(host.emitted).toEqual([]);
      });

      it('keeps what was typed before the page took over, and commits it on Enter', async () => {
        const { fixture, host, root } = mount(STEPPER(), undefined, (rendered) => {
          // The visitor typed into the server-rendered field before hydration.
          serverMarkup(rendered, '250').value = '270';
        });
        await settle(fixture);
        expect(inputOf(root).value).toBe('270');
        expect(host.emitted).toEqual([]);
        press(inputOf(root), 'Enter');
        await settle(fixture);
        expect(host.emitted).toEqual([270]);
        expect(inputOf(root).value).toBe('270');
      });

      it('follows a later value write again after typed text was kept', async () => {
        const { fixture, host, root } = mount(STEPPER(), undefined, (rendered) => {
          serverMarkup(rendered, '250').value = '270';
        });
        await settle(fixture);
        host.value.set(300);
        await settle(fixture);
        expect(inputOf(root).value).toBe('300');
        inputOf(root).blur();
        await settle(fixture);
        expect(host.emitted).toEqual([]);
      });

      it('shows an empty server field as empty', async () => {
        const { fixture, root } = mount(
          STEPPER(),
          (host) => host.value.set(null),
          (rendered) => serverMarkup(rendered, ''),
        );
        await settle(fixture);
        expect(inputOf(root).value).toBe('');
        expect(inputOf(root).hasAttribute('aria-valuenow')).toBe(false);
      });
    });
  });

  describe.each([
    ['light', TOKENS],
    ['dark', DARK_TOKENS],
  ])('accessibility in the %s theme', (name, tokens) => {
    it('has no axe violations in any state', async () => {
      const { fixture, root } = mount(
        `<div style="background: var(--ck-color-bg, #fff); color: var(--ck-color-fg)">
          <ck-stepper aria-label="FTP" unit="W" [min]="50" [max]="600" [value]="250" />
          <ck-stepper aria-label="Empty" [value]="null" />
          <ck-stepper aria-label="Locked" [value]="3" disabled />
          <ck-stepper aria-label="Read only" [value]="3" readonly />
          <ck-stepper aria-label="At the limit" [value]="600" [max]="600" />
          <ck-stepper aria-label="Per instance" decrementLabel="FTP minus 5" incrementLabel="FTP plus 5" [value]="5" />
          <span id="hint">Between 1 and 9</span>
          <ck-stepper aria-label="Hinted" aria-describedby="hint" [value]="5" />
        </div>`,
        undefined,
        undefined,
        tokens,
      );
      await settle(fixture);
      expect(getComputedStyle(query(root, 'ck-stepper')).colorScheme).toBe(
        name === 'dark' ? 'dark' : 'normal',
      );
      await expectNoAxeViolations(root);
    });
  });
});
