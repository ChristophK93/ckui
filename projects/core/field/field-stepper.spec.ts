import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { provideCkui } from '@ckui/core';
import { vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { DARK_TOKENS, mount, query, settle } from '../testing/field-host';

const REACTIVE = `
  <form [formGroup]="ftpForm" (ngSubmit)="submits.update((count) => count + 1)">
    <ck-field [invalid]="forced()" [size]="size()">
      <label>FTP</label>
      <ck-stepper formControlName="ftp" [min]="50" [max]="600" [step]="5" unit="W" />
      <ck-hint>Your functional threshold power.</ck-hint>
      <ck-error>Between 50 and 600 W.</ck-error>
    </ck-field>
    <button type="submit">Send</button>
  </form>
`;

/** No limits on the stepper, so a typed 700 reaches the form and `Validators.max` speaks. */
const UNBOUNDED = `
  <form [formGroup]="ftpForm" (ngSubmit)="submits.update((count) => count + 1)">
    <ck-field>
      <label>FTP</label>
      <ck-stepper formControlName="ftp" />
      <ck-hint>Your functional threshold power.</ck-hint>
      <ck-error>Between 50 and 600 W.</ck-error>
    </ck-field>
    <button type="submit">Send</button>
  </form>
`;

const NG_MODEL = `
  <form #ngForm="ngForm" (ngSubmit)="submits.update((count) => count + 1)">
    <ck-field>
      <label>FTP</label>
      <ck-stepper name="ftp" [ngModel]="modelFtp()" (ngModelChange)="modelFtp.set($event)" required [min]="50" [max]="600" />
      <ck-hint>Your functional threshold power.</ck-hint>
      <ck-error>Between 50 and 600 W.</ck-error>
    </ck-field>
    <button type="submit">Send</button>
  </form>
`;

const SIGNAL_FORMS = `
  <ck-field>
    <label>FTP</label>
    <ck-stepper [formField]="signalFtpForm.ftp" />
    <ck-hint>Your functional threshold power.</ck-hint>
    <ck-error>Between 50 and 600 W.</ck-error>
  </ck-field>
`;

const PLAIN = `
  <ck-field [size]="size()" [invalid]="forced()">
    <label>FTP</label>
    <ck-stepper [value]="250" [size]="stepperSizeValue()" aria-describedby="mine other" />
    <ck-hint>Hint.</ck-hint>
    <ck-error>Error.</ck-error>
  </ck-field>
`;

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

const rect = (element: Element) => element.getBoundingClientRect();

describe('ck-stepper in a ck-field', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    document.body.removeAttribute('dir');
    document.body.replaceChildren();
    TestBed.resetTestingModule();
    await emulate([]);
    await page.viewport(800, 600);
  });

  const fieldOf = (root: HTMLElement) => query(root, 'ck-field');
  const inputOf = (root: HTMLElement) => query<HTMLInputElement>(root, '.ck-stepper__input');
  const minusOf = (root: HTMLElement) =>
    query<HTMLButtonElement>(root, '.ck-stepper__button--decrement');
  const plusOf = (root: HTMLElement) =>
    query<HTMLButtonElement>(root, '.ck-stepper__button--increment');
  const errorOf = (root: HTMLElement) => query(root, 'ck-error');
  const submitOf = (root: HTMLElement) => query<HTMLButtonElement>(root, '[type=submit]');
  const warnings = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const describedBy = (root: HTMLElement) => inputOf(root).getAttribute('aria-describedby');
  const type = (root: HTMLElement, text: string): void => {
    inputOf(root).focus();
    inputOf(root).value = text;
    inputOf(root).dispatchEvent(new Event('input', { bubbles: true }));
  };

  describe('label and description', () => {
    it('points the label at the stepper input, and a click on the label focuses it', async () => {
      const { fixture, root } = mount(REACTIVE);
      await settle(fixture);
      const label = query<HTMLLabelElement>(root, 'label');
      expect(inputOf(root).id).not.toBe('');
      expect(label.getAttribute('for')).toBe(inputOf(root).id);
      expect(inputOf(root).labels?.[0]).toBe(label);
      label.click();
      expect(document.activeElement).toBe(inputOf(root));
    });

    it('does not warn about a missing name when the field has a label', async () => {
      const warn = warnings();
      const { fixture } = mount(REACTIVE);
      await settle(fixture);
      expect(warn).not.toHaveBeenCalled();
    });

    it('still warns when neither the field nor the stepper has a name', async () => {
      const warn = warnings();
      const { fixture } = mount('<ck-field><ck-stepper [value]="250" /></ck-field>');
      await settle(fixture);
      const messages = warn.mock.calls.map((call) => String(call[0])).join('\n');
      expect(messages).toContain('ck-stepper has no accessible name');
    });

    it('describes the input by the hint and a consumer id, and keeps the error out while hidden', async () => {
      const { fixture, host, root } = mount(PLAIN);
      await settle(fixture);
      const hint = query(root, 'ck-hint').id;
      expect(describedBy(root)).toBe(`mine other ${hint}`);
      host.size.set('lg');
      await settle(fixture);
      expect(describedBy(root)).toBe(`mine other ${hint}`);
      expect(errorOf(root).hidden).toBe(true);
    });

    it('adds the error id while the field shows errors and takes it away again', async () => {
      const { fixture, host, root } = mount(PLAIN);
      await settle(fixture);
      const hint = query(root, 'ck-hint').id;
      const error = errorOf(root).id;
      host.forced.set(true);
      await settle(fixture);
      expect(describedBy(root)).toBe(`mine other ${hint} ${error}`);
      expect(inputOf(root).getAttribute('aria-invalid')).toBe('true');
      host.forced.set(undefined);
      await settle(fixture);
      expect(describedBy(root)).toBe(`mine other ${hint}`);
      expect(inputOf(root).hasAttribute('aria-invalid')).toBe(false);
    });

    it('does not repeat an id the consumer listed too', async () => {
      const { fixture, root } = mount(
        `<ck-field><label>FTP</label><ck-stepper [value]="250" aria-describedby="h1" /><ck-hint id="h1">H</ck-hint></ck-field>`,
      );
      await settle(fixture);
      expect(describedBy(root)).toBe('h1');
    });

    it('leaves a stepper outside a field with exactly its own aria-describedby', async () => {
      const { fixture, root } = mount(
        '<ck-stepper aria-label="FTP" aria-describedby="mine" [value]="250" />',
      );
      await settle(fixture);
      expect(describedBy(root)).toBe('mine');
      expect(inputOf(root).hasAttribute('aria-invalid')).toBe(false);
      expect(inputOf(root).hasAttribute('aria-required')).toBe(false);
    });
  });

  describe('Reactive Forms', () => {
    it('marks the input required from the validators and takes it away with them', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-required')).toBe('true');
      expect(query(root, 'label').classList.contains('ck-field__label--required')).toBe(true);
      host.ftpForm.controls.ftp.removeValidators(Validators.required);
      host.ftpForm.controls.ftp.updateValueAndValidity();
      await settle(fixture);
      expect(inputOf(root).hasAttribute('aria-required')).toBe(false);
      expect(query(root, 'label').classList.contains('ck-field__label--required')).toBe(false);
    });

    it('shows no error before the first touch, then after blurring out of the stepper', async () => {
      const { fixture, host, root } = mount(UNBOUNDED);
      await settle(fixture);
      type(root, '700');
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      submitOf(root).focus();
      await settle(fixture);
      expect(host.ftpForm.controls.ftp.errors).toHaveProperty('max');
      expect(errorOf(root).hidden).toBe(false);
      expect(fieldOf(root).classList.contains('ck-field--invalid')).toBe(true);
      expect(inputOf(root).getAttribute('aria-invalid')).toBe('true');
      expect(describedBy(root)).toContain(errorOf(root).id);
    });

    it('shows no error while focus only moves between the input and the buttons', async () => {
      const { fixture, host, root } = mount(UNBOUNDED);
      host.ftpForm.controls.ftp.setValue(700);
      await settle(fixture);
      inputOf(root).focus();
      minusOf(root).focus();
      await settle(fixture);
      expect(host.ftpForm.controls.ftp.touched).toBe(false);
      expect(errorOf(root).hidden).toBe(true);
      submitOf(root).focus();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
    });

    it('shows the error after a submit without any touch, and clears it for a valid value', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      host.ftpForm.controls.ftp.setValue(null);
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      submitOf(root).click();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
      expect(inputOf(root).getAttribute('aria-invalid')).toBe('true');
      host.ftpForm.controls.ftp.setValue(300);
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      expect(inputOf(root).hasAttribute('aria-invalid')).toBe(false);
    });

    it('clamps a typed 700 to the stepper max, so the form stays valid', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      await settle(fixture);
      type(root, '700');
      submitOf(root).focus();
      await settle(fixture);
      expect(host.ftpForm.controls.ftp.value).toBe(600);
      expect(errorOf(root).hidden).toBe(true);
    });

    it('goes invalid for an emptied required stepper once touched', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      await settle(fixture);
      await userEvent.click(inputOf(root));
      await userEvent.clear(inputOf(root));
      await userEvent.tab();
      await settle(fixture);
      expect(host.ftpForm.controls.ftp.value).toBeNull();
      expect(errorOf(root).hidden).toBe(false);
    });

    it('writes a button step into the form', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      await settle(fixture);
      plusOf(root).click();
      await settle(fixture);
      expect(host.ftpForm.controls.ftp.value).toBe(255);
    });
  });

  describe('ngModel', () => {
    it('requires, then shows the error after blur', async () => {
      const { fixture, host, root } = mount(NG_MODEL);
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-required')).toBe('true');
      host.modelFtp.set(null);
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      inputOf(root).focus();
      submitOf(root).focus();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
      expect(inputOf(root).getAttribute('aria-invalid')).toBe('true');
    });

    it('shows the error after a submit', async () => {
      const { fixture, host, root } = mount(NG_MODEL);
      host.modelFtp.set(null);
      await settle(fixture);
      submitOf(root).click();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
    });
  });

  describe('Signal Forms', () => {
    it('requires, shows the error after blur and clears it again', async () => {
      const { fixture, host, root } = mount(SIGNAL_FORMS);
      await settle(fixture);
      expect(inputOf(root).getAttribute('aria-required')).toBe('true');
      host.signalFtpForm.ftp().value.set(700);
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
      inputOf(root).focus();
      inputOf(root).blur();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
      expect(inputOf(root).getAttribute('aria-invalid')).toBe('true');
      host.signalFtpForm.ftp().value.set(300);
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(true);
    });

    it('shows the error after the form is submitted', async () => {
      const { fixture, host, root } = mount(SIGNAL_FORMS);
      host.signalFtpForm.ftp().value.set(700);
      await settle(fixture);
      host.submitSignalFtp();
      await settle(fixture);
      expect(errorOf(root).hidden).toBe(false);
    });
  });

  describe('disabled', () => {
    it('greys the field and disables the input and both buttons for a disabled control', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      await settle(fixture);
      host.ftpForm.controls.ftp.disable();
      await settle(fixture);
      expect(fieldOf(root).classList.contains('ck-field--disabled')).toBe(true);
      expect(inputOf(root).disabled).toBe(true);
      expect(minusOf(root).disabled).toBe(true);
      expect(plusOf(root).disabled).toBe(true);
      host.ftpForm.controls.ftp.enable();
      await settle(fixture);
      expect(fieldOf(root).classList.contains('ck-field--disabled')).toBe(false);
    });

    it('greys the field for a stepper inside a disabled fieldset', async () => {
      const { fixture, root } = mount(
        '<fieldset disabled><ck-field><label>FTP</label><ck-stepper [value]="250" /></ck-field></fieldset>',
      );
      await settle(fixture);
      expect(fieldOf(root).classList.contains('ck-field--disabled')).toBe(true);
    });

    it('greys the field for the disabled input of the stepper', async () => {
      const { fixture, root } = mount(
        '<ck-field><label>FTP</label><ck-stepper [value]="250" disabled /></ck-field>',
      );
      await settle(fixture);
      expect(fieldOf(root).classList.contains('ck-field--disabled')).toBe(true);
    });
  });

  describe('size', () => {
    it('takes the size of the field', async () => {
      const { fixture, host, root } = mount(PLAIN);
      host.size.set('xl');
      await settle(fixture);
      expect(query(root, 'ck-stepper').classList.contains('ck-stepper--xl')).toBe(true);
      host.size.set('sm');
      await settle(fixture);
      expect(query(root, 'ck-stepper').classList.contains('ck-stepper--sm')).toBe(true);
    });

    it('takes the configured size when neither the field nor the stepper sets one', async () => {
      TestBed.configureTestingModule({ providers: [provideCkui({ size: 'lg' })] });
      const { fixture, root } = mount(PLAIN);
      await settle(fixture);
      expect(query(root, 'ck-stepper').classList.contains('ck-stepper--lg')).toBe(true);
    });

    it('lets its own size win over the field', async () => {
      const { fixture, host, root } = mount(PLAIN);
      host.size.set('xl');
      host.stepperSizeValue.set('sm');
      await settle(fixture);
      expect(query(root, 'ck-stepper').classList.contains('ck-stepper--sm')).toBe(true);
      expect(fieldOf(root).classList.contains('ck-field--xl')).toBe(true);
    });
  });

  describe('label', () => {
    it('stays floated empty, focused, blurred and filled', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      await settle(fixture);
      const floated = () => fieldOf(root).classList.contains('ck-field--floated');
      expect(floated()).toBe(true);
      host.ftpForm.controls.ftp.setValue(null);
      await settle(fixture);
      expect(floated()).toBe(true);
      inputOf(root).focus();
      await settle(fixture);
      expect(floated()).toBe(true);
      inputOf(root).blur();
      await settle(fixture);
      expect(floated()).toBe(true);
    });
  });

  describe('server rendering', () => {
    it('renders the field around the stepper without warnings', () => {
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
      const warn = warnings();
      const { fixture, root } = mount(REACTIVE);
      TestBed.inject(ApplicationRef).tick();
      expect(inputOf(root).getAttribute('value')).toBe('250');
      expect(inputOf(root).id).not.toBe('');
      expect(fieldOf(root).classList.contains('ck-field--md')).toBe(true);
      expect(warn).not.toHaveBeenCalled();
      fixture.destroy();
    });
  });

  describe('accessibility', () => {
    it.each([
      ['light', undefined],
      ['dark', DARK_TOKENS],
    ])('has no axe violations in %s, valid and invalid', async (_name, tokens) => {
      const { fixture, host, root } = mount(REACTIVE, undefined, tokens);
      root.style.background = 'var(--ck-color-bg, #fff)';
      await settle(fixture);
      await expectNoAxeViolations(root);
      host.forced.set(true);
      await settle(fixture);
      await expectNoAxeViolations(root);
    });
  });

  describe('look and layout', () => {
    const parts = (root: HTMLElement) => ({
      box: rect(query(root, '.ck-field__box')),
      stepper: rect(query(root, 'ck-stepper')),
      minus: rect(minusOf(root)),
      plus: rect(plusOf(root)),
      input: rect(inputOf(root)),
      value: rect(query(root, '.ck-stepper__field')),
      label: rect(query(root, 'label')),
    });

    it('draws the box of the field and none of its own', async () => {
      const { fixture, root } = mount(REACTIVE);
      await settle(fixture);
      const stepper = getComputedStyle(query(root, 'ck-stepper'));
      expect(stepper.boxShadow).toBe('none');
      expect(stepper.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(stepper.outlineStyle).toBe('none');
      expect(getComputedStyle(query(root, '.ck-field__box')).borderTopWidth).toBe('1px');
    });

    it('puts the buttons at the edges of the box, square at the control height', async () => {
      const { fixture, root } = mount(REACTIVE);
      await settle(fixture);
      const { box, minus, plus } = parts(root);
      expect(minus.left).toBeCloseTo(box.left, 0);
      expect(plus.right).toBeCloseTo(box.right, 0);
      expect(minus.top).toBeCloseTo(box.top, 0);
      expect(minus.bottom).toBeCloseTo(box.bottom, 0);
      expect(minus.width).toBe(40);
      expect(minus.height).toBe(40);
      expect(plus.width).toBe(40);
      expect(box.height).toBe(40);
    });

    it('keeps the value centred between the buttons', async () => {
      const { fixture, root } = mount(REACTIVE);
      await settle(fixture);
      const { minus, plus, value } = parts(root);
      expect(value.left + value.width / 2).toBeCloseTo((minus.right + plus.left) / 2, 0);
    });

    it('mirrors the layout in right-to-left text', async () => {
      const { fixture, root } = mount(REACTIVE);
      root.setAttribute('dir', 'rtl');
      await settle(fixture);
      const { box, minus, plus } = parts(root);
      expect(minus.right).toBeCloseTo(box.right, 0);
      expect(plus.left).toBeCloseTo(box.left, 0);
    });

    it.each([
      ['sm', 32, 44],
      ['md', 40, 44],
      ['lg', 48, 48],
      ['xl', 60, 60],
    ] as const)(
      'is %s: %spx on a fine pointer, at least %spx with the coarse tokens, hit at the box edges',
      async (size, fine, coarse) => {
        const { fixture, host, root } = mount(REACTIVE);
        host.size.set(size);
        await settle(fixture);
        expect(parts(root).minus.height).toBe(fine);
        root.setAttribute(
          'style',
          `${root.getAttribute('style')};--ck-control-height-sm:44px;--ck-control-height-md:44px`,
        );
        await settle(fixture);
        const { box, minus, plus } = parts(root);
        expect(minus.width).toBe(coarse);
        expect(minus.height).toBeGreaterThanOrEqual(44);
        expect(plus.width).toBeGreaterThanOrEqual(44);
        const middle = box.top + box.height / 2;
        expect(document.elementFromPoint(box.left + 2, middle)?.closest('button')).toBe(
          minusOf(root),
        );
        expect(document.elementFromPoint(box.right - 2, middle)?.closest('button')).toBe(
          plusOf(root),
        );
        expect(document.elementFromPoint(box.left + 2, box.top + 1)?.closest('button')).toBe(
          minusOf(root),
        );
      },
    );

    it('floats the label on the top border', async () => {
      const { fixture, root } = mount(REACTIVE);
      await settle(fixture);
      const { box, label } = parts(root);
      expect(label.top + label.height / 2).toBeCloseTo(box.top, 0);
    });

    it('rings the box, not the stepper, for keyboard focus, and turns it danger when invalid', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      await settle(fixture);
      await userEvent.tab();
      await settle(fixture);
      expect(document.activeElement).toBe(inputOf(root));
      const box = getComputedStyle(query(root, '.ck-field__box'));
      expect(box.borderTopColor).toBe('rgb(0, 0, 255)');
      expect(box.boxShadow).toContain('rgb(0, 0, 255)');
      expect(getComputedStyle(query(root, 'ck-stepper')).outlineStyle).toBe('none');
      host.forced.set(true);
      await settle(fixture);
      const invalid = getComputedStyle(query(root, '.ck-field__box'));
      expect(invalid.borderTopColor).toBe('rgb(200, 30, 30)');
      expect(invalid.boxShadow).toContain('rgb(200, 30, 30)');
    });

    it('shows no ring on the box for a click on a button', async () => {
      const { fixture, root } = mount(REACTIVE);
      await settle(fixture);
      await userEvent.click(plusOf(root));
      await settle(fixture);
      expect(getComputedStyle(query(root, '.ck-field__box')).outlineStyle).toBe('none');
    });

    it('uses system colours for the ring and the invalid border in forced colors', async () => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const { fixture, host, root } = mount(REACTIVE);
      await settle(fixture);
      const systemColor = (name: string): string => {
        const probe = document.createElement('span');
        probe.style.color = name;
        root.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      await userEvent.tab();
      await settle(fixture);
      const box = getComputedStyle(query(root, '.ck-field__box'));
      expect(box.outlineStyle).toBe('solid');
      expect(box.outlineColor).toBe(systemColor('Highlight'));
      expect(box.borderTopColor).toBe(systemColor('Highlight'));
      expect(getComputedStyle(query(root, 'ck-stepper')).outlineStyle).toBe('none');
      host.forced.set(true);
      await settle(fixture);
      inputOf(root).blur();
      await settle(fixture);
      expect(getComputedStyle(query(root, '.ck-field__box')).borderTopColor).toBe(
        systemColor('Mark'),
      );
    });

    it('greys the box, the value and the buttons for a disabled control, in forced colors too', async () => {
      const { fixture, host, root } = mount(REACTIVE);
      host.ftpForm.controls.ftp.disable();
      await settle(fixture);
      expect(getComputedStyle(query(root, '.ck-field__box')).cursor).toBe('not-allowed');
      expect(getComputedStyle(inputOf(root)).color).toBe('rgb(150, 150, 160)');
      expect(getComputedStyle(minusOf(root)).color).toBe('rgb(150, 150, 160)');
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const probe = document.createElement('span');
      probe.style.color = 'GrayText';
      root.append(probe);
      expect(getComputedStyle(query(root, '.ck-field__box')).borderTopColor).toBe(
        getComputedStyle(probe).color,
      );
      expect(getComputedStyle(query(root, 'ck-stepper')).outlineStyle).toBe('none');
    });

    it('fits a 390px page with a long label and error', async () => {
      await page.viewport(390, 844);
      const { fixture, host, root } = mount(
        `<div style="inline-size:358px"><ck-field [invalid]="forced()"><label>A functional threshold power label that is long</label><ck-stepper [value]="250" [min]="50" [max]="600" unit="W" /><ck-error>An error that is long enough to wrap onto a second line of the page.</ck-error></ck-field></div>`,
      );
      host.forced.set(true);
      await settle(fixture);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      expect(parts(root).stepper.width).toBeLessThanOrEqual(360);
    });
  });
});
