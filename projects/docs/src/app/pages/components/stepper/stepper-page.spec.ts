import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkStepper } from '@ckui/core/stepper';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { StepperPage } from './stepper-page';
import { RESET_BREAKS, RESET_SCOPED, SAMPLES } from './stepper-samples';

describe('StepperPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [StepperPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(StepperPage);
    document.body.appendChild(fixture.nativeElement);
    await settle();
    await settleAnimations();
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.inject(ApplicationRef).tick();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  const stepperNamed = (element: HTMLElement, name: string): HTMLElement =>
    element
      .querySelector<HTMLInputElement>(`input[aria-label="${name}"]`)!
      .closest<HTMLElement>('ck-stepper')!;
  const inputIn = (stepper: HTMLElement): HTMLInputElement =>
    stepper.querySelector<HTMLInputElement>('.ck-stepper__input')!;
  const buttonIn = (stepper: HTMLElement, which: 'decrement' | 'increment'): HTMLButtonElement =>
    stepper.querySelector<HTMLButtonElement>(`.ck-stepper__button--${which}`)!;
  const demoAfter = (element: HTMLElement, id: string): HTMLElement =>
    element.querySelector<HTMLElement>(`#${id} ~ .demo`)!;

  afterEach(() => {
    document.body.replaceChildren();
    document.head.querySelectorAll('style[data-test-reset]').forEach((style) => style.remove());
    resetTestTheme();
  });

  it('has the five sections in order, with one h1 and no skipped heading levels', async () => {
    const element = await render();
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(Array.from(element.querySelectorAll('h2'), (heading) => heading.textContent)).toEqual([
      'Examples',
      'API',
      'Keyboard',
      'Accessibility',
      'Tokens',
    ]);
    let previous = 1;
    for (const heading of Array.from(element.querySelectorAll('h1, h2, h3, h4'))) {
      const level = Number(heading.tagName.slice(1));
      expect(level - previous).toBeLessThanOrEqual(1);
      previous = level;
    }
  });

  it('renders every code sample as plain text in a pre block', async () => {
    const element = await render();
    const blocks = Array.from(element.querySelectorAll('pre > code'), (code) => code.textContent);
    expect(blocks).toEqual(Object.values(SAMPLES));
    expect(element.querySelectorAll('pre code *')).toHaveLength(0);
  });

  it('shows every TypeScript sample with all the imports its names need and no stray top-level code', () => {
    const typescript = Object.entries(SAMPLES).filter(
      ([name]) => name !== 'reset' && name !== 'tokens',
    );
    expect(typescript.map(([name]) => name)).toEqual([
      'basics',
      'reactive',
      'template',
      'signal',
      'sizes',
      'unit',
      'decimals',
      'limits',
      'states',
      'labels',
      'ftp',
      'field',
    ]);
    // `min` and `max` are also attribute names in the templates, so they count as used when called.
    const needs: [string, string, RegExp?][] = [
      ['Component', '@angular/core'],
      ['signal', '@angular/core'],
      ['CkStepper', '@ckui/core/stepper'],
      ['FormControl', '@angular/forms'],
      ['ReactiveFormsModule', '@angular/forms'],
      ['FormsModule', '@angular/forms'],
      ['FormGroup', '@angular/forms'],
      ['Validators', '@angular/forms'],
      ['CK_FIELD_IMPORTS', '@ckui/core/field'],
      ['FormField', '@angular/forms/signals'],
      ['form', '@angular/forms/signals', /\bform\(/],
      ['min', '@angular/forms/signals', /(?<!\.)\bmin\(/],
      ['max', '@angular/forms/signals', /(?<!\.)\bmax\(/],
    ];
    for (const [name, sample] of typescript) {
      const importLines = sample.split('\n').filter((line) => line.startsWith('import '));
      const body = sample
        .split('\n')
        .filter((line) => !line.startsWith('import '))
        .join('\n');
      for (const [identifier, module, usage] of needs) {
        if ((usage ?? new RegExp(`\\b${identifier}\\b`)).test(body)) {
          expect(
            importLines.some(
              (line) =>
                line.includes(`from '${module}'`) && new RegExp(`\\b${identifier}\\b`).test(line),
            ),
            `${name} uses ${identifier}`,
          ).toBe(true);
        }
      }
      for (const line of importLines) {
        const imported = /\{([^}]*)\}/
          .exec(line)![1]
          .split(',')
          .map((part) => part.trim());
        for (const identifier of imported) {
          expect(body, `${name} imports ${identifier}`).toMatch(new RegExp(`\\b${identifier}\\b`));
        }
      }
      expect(sample, name).toContain('@Component');
      expect(sample, name).toMatch(/export class \w+ \{/);
      expect(body.trim().startsWith('@Component'), `${name} has no stray top-level code`).toBe(
        true,
      );
      const outside = sample.slice(0, sample.indexOf('export class'));
      expect(outside, name).not.toMatch(/\binject\(/);
      expect(sample, name).not.toMatch(/^\s*(const|let) \w+ = (inject|await)/m);
      expect(sample, name).toMatch(/imports: \[[^\]]*CkStepper[^\]]*\]/);
      // In a field the label names the input.
      expect(sample, name).toMatch(name === 'field' ? /<label>/ : /aria-label(ledby)?=/);
      // Every template name is declared, so the sample compiles as copied.
      for (const [, used] of Array.from(
        body.matchAll(/\[\(?(?:value|ngModel)\)?\]="([A-Za-z_]\w*)(?:\(\))?"/g),
      )) {
        expect(body, `${name} declares ${used}`).toMatch(
          new RegExp(`(readonly |protected |private )+${used}\\b|\\b${used} =`),
        );
      }
    }
    // State that changes after a callback is a signal, so the samples work in a zoneless app.
    for (const name of ['basics', 'unit', 'decimals', 'limits', 'labels', 'ftp'] as const) {
      expect(SAMPLES[name], name).toContain("import { Component, signal } from '@angular/core'");
      expect(SAMPLES[name], name).toMatch(/\[\(value\)\]="\w+"/);
    }
    expect(SAMPLES.reactive).toContain('[formControl]="ftp"');
    expect(SAMPLES.template).toContain('[(ngModel)]="ftp"');
    expect(SAMPLES.signal).toContain('[formField]="settings.ftp"');
    expect(SAMPLES.sizes).toContain('size="xl"');
    expect(SAMPLES.labels).toContain('decrementLabel="FTP minus 5"');
    expect(SAMPLES.ftp).toContain('aria-labelledby="ftp-label"');
    expect(SAMPLES.field).toContain('formControlName="ftp"');
    expect(SAMPLES.field).toContain('<ck-hint>');
    expect(SAMPLES.field).toContain('<ck-error>');
    expect(SAMPLES.tokens).toContain('--ck-stepper-value-width');
    for (const name of ['reset', 'tokens'] as const) {
      expect(SAMPLES[name], name).toContain('{');
    }
  });

  it('never shows the internal entry point or the icon component', async () => {
    const element = await render();
    expect(element.textContent).not.toContain('@ckui/core/internal');
    expect(element.textContent).not.toContain('<ck-icon');
    for (const sample of Object.values(SAMPLES)) {
      expect(sample).not.toContain('@ckui/core/internal');
      expect(sample).not.toContain('ck-icon');
    }
  });

  it('documents every input of the stepper', async () => {
    const element = await render();
    const documented = Array.from(
      element.querySelectorAll('#api + .table-scroll tbody tr'),
      (row) => row.querySelector('th')!.textContent!.trim(),
    ).sort();
    const declared = reflectComponentType(CkStepper)!
      .inputs.map((input) => input.templateName)
      .sort();
    expect(documented).toEqual(declared);
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('names every input on the page', async () => {
    const element = await render();
    const inputs = Array.from(element.querySelectorAll<HTMLInputElement>('.ck-stepper__input'));
    expect(inputs.length).toBeGreaterThanOrEqual(12);
    for (const input of inputs) {
      const labelledby = input.getAttribute('aria-labelledby');
      const name =
        input.getAttribute('aria-label') ??
        (labelledby ? element.querySelector(`#${labelledby}`)?.textContent : null) ??
        input.labels?.[0]?.textContent;
      expect(name?.trim(), input.outerHTML).toBeTruthy();
    }
  });

  describe('the examples', () => {
    it('steps the level with the buttons and stops at the limits', async () => {
      const element = await render();
      const demo = demoAfter(element, 'basics');
      const stepper = stepperNamed(element, 'Resistance level');
      expect(inputIn(stepper).value).toBe('8');
      await userEvent.click(buttonIn(stepper, 'increment'));
      await settle();
      expect(demo.querySelector('output')!.textContent).toBe('9');
      inputIn(stepper).focus();
      await userEvent.keyboard('{End}');
      await settle();
      expect(demo.querySelector('output')!.textContent).toBe('24');
      expect(buttonIn(stepper, 'increment').disabled).toBe(true);
      await userEvent.keyboard('{Home}');
      await settle();
      expect(demo.querySelector('output')!.textContent).toBe('1');
      expect(buttonIn(stepper, 'decrement').disabled).toBe(true);
    });

    it('commits a typed number to the model and shows it snapped', async () => {
      const element = await render();
      const stepper = stepperNamed(element, 'Target power');
      const input = inputIn(stepper);
      await userEvent.clear(input);
      await userEvent.type(input, '253{Enter}');
      await settle();
      expect(input.value).toBe('255');
      expect(demoAfter(element, 'unit').querySelector('output')!.textContent).toBe('255');
      expect(input.getAttribute('aria-valuetext')).toBe('255 W');
    });

    it('counts a step of 0.5 from the minimum and shows one decimal', async () => {
      const element = await render();
      const stepper = stepperNamed(element, 'Grade');
      expect(inputIn(stepper).value).toBe('4.5');
      await userEvent.click(buttonIn(stepper, 'increment'));
      await settle();
      expect(inputIn(stepper).value).toBe('5.0');
      expect(demoAfter(element, 'decimals').querySelector('output')!.textContent).toBe('5');
    });

    it('turns an empty field into none, and the clear button empties the empty stepper', async () => {
      const element = await render();
      const demo = demoAfter(element, 'limits');
      const stepper = stepperNamed(element, 'Cadence, empty');
      expect(inputIn(stepper).value).toBe('');
      await userEvent.click(buttonIn(stepper, 'increment'));
      await settle();
      expect(inputIn(stepper).value).toBe('40');
      await userEvent.click(demo.querySelector('button.ck-button, button[ckButton]')!);
      await settle();
      expect(inputIn(stepper).value).toBe('');
      expect(demo.querySelectorAll('output')[1].textContent).toBe('none');
    });

    it('keeps the three form demos in sync with their forms', async () => {
      const element = await render();
      const reactive = stepperNamed(element, 'FTP, Reactive Forms');
      const demo = demoAfter(element, 'reactive-forms');
      await userEvent.click(buttonIn(reactive, 'increment'));
      await settle();
      expect(demo.querySelectorAll('output')[0].textContent).toBe('251');
      expect(demo.querySelectorAll('output')[1].textContent).toBe('yes');
      await userEvent.click(demo.querySelectorAll('.actions button')[0]);
      await settle();
      expect(inputIn(reactive).value).toBe('300');
      await userEvent.click(demo.querySelectorAll('.actions button')[1]);
      await settle();
      expect(inputIn(reactive).value).toBe('');
      expect(demo.querySelectorAll('output')[0].textContent).toBe('none');
      await userEvent.click(demo.querySelectorAll('.actions button')[2]);
      await settle();
      expect(inputIn(reactive).disabled).toBe(true);

      const model = stepperNamed(element, 'FTP, ngModel');
      await userEvent.click(buttonIn(model, 'increment'));
      await settle();
      expect(demoAfter(element, 'ng-model').querySelector('output')!.textContent).toBe('251');

      const signal = stepperNamed(element, 'FTP, Signal Forms');
      await userEvent.click(buttonIn(signal, 'decrement'));
      await settle();
      expect(demoAfter(element, 'signal-forms').querySelector('output')!.textContent).toBe('249');
    });

    it('shows the four sizes at their control heights', async () => {
      const element = await render();
      const heights = ['Small', 'Medium', 'Large', 'Extra large'].map(
        (name) => stepperNamed(element, name).getBoundingClientRect().height,
      );
      expect(heights).toEqual([32, 40, 48, 60]);
    });

    it('names the buttons per instance and disables the locked ones', async () => {
      const element = await render();
      const stepper = stepperNamed(element, 'FTP');
      expect(buttonIn(stepper, 'decrement').getAttribute('aria-label')).toBe('FTP minus 5');
      expect(buttonIn(stepper, 'increment').getAttribute('aria-label')).toBe('FTP plus 5');
      const locked = stepperNamed(element, 'Disabled');
      expect(inputIn(locked).disabled).toBe(true);
      expect(inputIn(stepperNamed(element, 'Read only')).readOnly).toBe(true);
    });

    it('recreates the settings row: a label names the input, steps of 5, limits 50 to 600', async () => {
      const element = await render();
      const row = element.querySelector<HTMLElement>('.row')!;
      const input = inputIn(row.querySelector<HTMLElement>('ck-stepper')!);
      expect(input.getAttribute('aria-labelledby')).toBe('ftp-label');
      expect(input.value).toBe('250');
      await userEvent.click(buttonIn(row.querySelector<HTMLElement>('ck-stepper')!, 'increment'));
      await settle();
      expect(input.value).toBe('255');
      expect(input.getAttribute('aria-valuetext')).toBe('255 W');
      expect(input.getAttribute('aria-valuemin')).toBe('50');
      expect(input.getAttribute('aria-valuemax')).toBe('600');
    });
  });

  describe('in a field', () => {
    const demo = (element: HTMLElement): HTMLElement => demoAfter(element, 'in-field');

    it('names the input with the field label and shows the hint', async () => {
      const element = await render();
      const field = demo(element);
      const input = inputIn(field.querySelector<HTMLElement>('ck-stepper')!);
      expect(input.labels?.[0]?.textContent).toContain('FTP');
      expect(input.getAttribute('aria-required')).toBe('true');
      const hint = field.querySelector('ck-hint')!;
      expect(input.getAttribute('aria-describedby')).toBe(hint.id);
      expect(field.querySelector('ck-error')!.hasAttribute('hidden')).toBe(true);
    });

    it('shows the error under the box after clearing the value and leaving, not before', async () => {
      const element = await render();
      const field = demo(element);
      const input = inputIn(field.querySelector<HTMLElement>('ck-stepper')!);
      const error = field.querySelector('ck-error')!;
      await userEvent.click(input);
      await userEvent.clear(input);
      await settle();
      expect(error.hasAttribute('hidden')).toBe(true);
      await userEvent.tab();
      await settle();
      expect(error.hasAttribute('hidden')).toBe(false);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toContain(error.id);
      expect(field.querySelector('.ck-field__box')!.getBoundingClientRect().bottom).toBeLessThan(
        error.getBoundingClientRect().top,
      );
    });

    it('saves a valid value on submit and shows the error for an empty one', async () => {
      const element = await render();
      const field = demo(element);
      const stepper = field.querySelector<HTMLElement>('ck-stepper')!;
      const saved = field.querySelector('output')!;
      await userEvent.click(buttonIn(stepper, 'increment'));
      await userEvent.click(field.querySelector<HTMLButtonElement>('button[type=submit]')!);
      await settle();
      expect(saved.textContent).toBe('255');
      await userEvent.clear(inputIn(stepper));
      await userEvent.click(field.querySelector<HTMLButtonElement>('button[type=submit]')!);
      await settle();
      expect(saved.textContent).toBe('255');
      expect(field.querySelector('ck-error')!.hasAttribute('hidden')).toBe(false);
    });
  });

  describe('global resets', () => {
    function applyReset(css: string): void {
      const style = document.createElement('style');
      style.dataset['testReset'] = '';
      style.textContent = css;
      document.head.appendChild(style);
    }

    it('shows a reset that really breaks the buttons and the input', async () => {
      const element = await render();
      const stepper = stepperNamed(element, 'Resistance level');
      expect(getComputedStyle(buttonIn(stepper, 'increment')).borderTopWidth).toBe('0px');
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(buttonIn(stepper, 'increment')).borderTopWidth).toBe('1px');
      expect(getComputedStyle(inputIn(stepper)).borderTopWidth).toBe('1px');
    });

    it('shows a scoped reset that leaves the stepper alone but still hits other controls', async () => {
      const element = await render();
      const stepper = stepperNamed(element, 'Resistance level');
      const other = element.querySelector<HTMLElement>('button[ckButton], button.ck-button')!;
      applyReset(RESET_SCOPED.split('/* Or declare')[0]);
      expect(getComputedStyle(buttonIn(stepper, 'increment')).borderTopWidth).toBe('0px');
      expect(getComputedStyle(inputIn(stepper)).borderTopWidth).toBe('0px');
      expect(getComputedStyle(other).borderTopWidth).toBe('1px');
    });
  });

  describe('table layout', () => {
    afterEach(async () => {
      await page.viewport(800, 600);
    });

    it('keeps every row header on one line at 1280px', async () => {
      await page.viewport(1280, 800);
      const element = await render();
      const headers = Array.from(element.querySelectorAll('table tbody th[scope="row"]'));
      expect(headers.length).toBeGreaterThanOrEqual(10);
      for (const header of headers) {
        for (const item of Array.from(header.querySelectorAll('code, kbd'))) {
          expect(item.getClientRects().length, header.textContent!).toBe(1);
        }
      }
    });

    it('does not overflow the page at 390px, and every stepper fits it', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const stepper of Array.from(element.querySelectorAll<HTMLElement>('ck-stepper'))) {
        expect(stepper.getBoundingClientRect().right).toBeLessThanOrEqual(390);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, also with a value typed and the buttons at a limit', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      const stepper = stepperNamed(element, 'Resistance level');
      inputIn(stepper).focus();
      await userEvent.keyboard('{End}');
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
      const fieldInput = inputIn(
        demoAfter(element, 'in-field').querySelector<HTMLElement>('ck-stepper')!,
      );
      await userEvent.click(fieldInput);
      await userEvent.clear(fieldInput);
      await userEvent.tab();
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
    });
  });
});
