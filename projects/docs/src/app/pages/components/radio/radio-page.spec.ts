import { ApplicationRef, Type, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkRadio, CkRadioGroup } from '@ckui/core/radio';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { RadioPage } from './radio-page';
import { RESET_BREAKS, RESET_SCOPED, SAMPLES } from './radio-samples';

describe('RadioPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [RadioPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(RadioPage);
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

  const radioNamed = (scope: HTMLElement, name: string): HTMLInputElement =>
    Array.from(scope.querySelectorAll<HTMLElement>('ck-radio'))
      .find((candidate) => candidate.textContent?.trim().startsWith(name))!
      .querySelector<HTMLInputElement>('.ck-radio__input')!;
  const demoAfter = (element: HTMLElement, id: string): HTMLElement =>
    element.querySelector<HTMLElement>(`#${id} ~ .demo`)!;
  const outputs = (demo: HTMLElement): string[] =>
    Array.from(demo.querySelectorAll('output'), (output) => output.textContent!);
  const checkedOf = (scope: HTMLElement): boolean[] =>
    Array.from(
      scope.querySelectorAll<HTMLInputElement>('.ck-radio__input'),
      (input) => input.checked,
    );

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
      'inline',
      'form',
      'objects',
      'reactive',
      'template',
      'signal',
      'sizes',
      'states',
      'rtl',
    ]);
    const needs: [string, RegExp, string][] = [
      ['Component', /\bComponent\b/, '@angular/core'],
      ['signal', /\bsignal[<(]/, '@angular/core'],
      ['CK_RADIO_IMPORTS', /\bCK_RADIO_IMPORTS\b/, '@ckui/core/radio'],
      ['CkButton', /\bckButton\b/, '@ckui/core/button'],
      ['FormControl', /\bnew FormControl\b/, '@angular/forms'],
      ['FormGroup', /\bnew FormGroup\b/, '@angular/forms'],
      ['Validators', /\bValidators\.\w+\(?/, '@angular/forms'],
      ['ReactiveFormsModule', /\[(formControl|formGroup)\]|formControlName/, '@angular/forms'],
      ['FormsModule', /\[\(ngModel\)\]/, '@angular/forms'],
      ['FormField', /\[formField\]/, '@angular/forms/signals'],
      ['form', /(?<![.\w])form\(/, '@angular/forms/signals'],
      ['required', /(?<![.\w])required\(/, '@angular/forms/signals'],
    ];
    for (const [name, sample] of typescript) {
      const importLines = sample.split('\n').filter((line) => line.startsWith('import '));
      const body = sample
        .split('\n')
        .filter((line) => !line.startsWith('import '))
        .join('\n');
      for (const [identifier, usage, module] of needs) {
        if (usage.test(body)) {
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
      expect(sample, name).toMatch(/imports: \[[^\]]*CK_RADIO_IMPORTS[^\]]*\]/);
      // Every template name is declared, so the sample compiles as copied.
      const bound = Array.from(
        body.matchAll(
          /\[\(?(?:value|ngModel)\)?\]="([A-Za-z_]\w*)(?:\(\))?"|\[(?:formControl|formField|formGroup|compareWith)\]="([A-Za-z_]\w*)|formControlName="(\w+)"/g,
        ),
        (match) => match[1] ?? match[2] ?? match[3],
      ).filter((used) => !['true', 'false'].includes(used));
      for (const used of bound) {
        expect(body, `${name} declares ${used}`).toMatch(
          new RegExp(`(readonly |protected |private )+${used}\\b|\\b${used} =|\\b${used}: `),
        );
      }
      // A group names itself: a label as its first child, or aria-label.
      for (const match of body.matchAll(/<ck-radio-group\b[^>]*>\s*(?:<label>)?/g)) {
        expect(match[0], name).toMatch(/aria-label(ledby)?=|<label>/);
      }
    }
    // State that changes after a callback is a signal, so the samples work in a zoneless app.
    for (const name of ['basics', 'inline', 'rtl'] as const) {
      expect(SAMPLES[name], name).toContain("import { Component, signal } from '@angular/core'");
      expect(SAMPLES[name], name).toMatch(/\[\(value\)\]="\w+"/);
    }
    expect(SAMPLES.basics).toContain('<ck-hint>');
    expect(SAMPLES.basics).toContain('disabled');
    expect(SAMPLES.inline).toContain('inline');
    expect(SAMPLES.form).toContain('Validators.required');
    expect(SAMPLES.form).toContain('<ck-error>');
    expect(SAMPLES.objects).toContain('[compareWith]="sameZone"');
    expect(SAMPLES.reactive).toContain('[formControl]="unit"');
    expect(SAMPLES.template).toContain('[(ngModel)]="unit"');
    expect(SAMPLES.signal).toContain('[formField]="plan.unit"');
    expect(SAMPLES.sizes).toContain('size="xl"');
    expect(SAMPLES.states).toContain('<fieldset disabled>');
    expect(SAMPLES.rtl).toContain('dir="rtl"');
    expect(SAMPLES.tokens).toContain('--ck-radio-checked-bg');
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

  it('documents every input of the group, the radio and the hint and error', async () => {
    const element = await render();
    const tables = Array.from(element.querySelectorAll('#api ~ .table-scroll'));
    const documented = (index: number): string[] =>
      Array.from(tables[index].querySelectorAll('tbody tr'), (row) =>
        row.querySelector('th')!.textContent!.trim(),
      ).sort();
    const declared = (type: Type<unknown>): string[] =>
      reflectComponentType(type)!
        .inputs.map((input) => input.templateName)
        .sort();
    expect(documented(0)).toEqual(declared(CkRadioGroup));
    expect(documented(1)).toEqual(declared(CkRadio));
    // Directives have no component metadata, so their one input is checked by name.
    expect(documented(2)).toEqual(['id']);
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('names every radio and every group on the page', async () => {
    const element = await render();
    const inputs = Array.from(element.querySelectorAll<HTMLInputElement>('.ck-radio__input'));
    expect(inputs.length).toBeGreaterThanOrEqual(25);
    for (const input of inputs) {
      const label = input.getAttribute('aria-label');
      const labelledby = input.getAttribute('aria-labelledby');
      const name = label ?? element.querySelector(`#${labelledby}`)?.textContent;
      expect(name?.trim(), input.outerHTML).toBeTruthy();
    }
    const groups = Array.from(element.querySelectorAll('ck-radio-group'));
    expect(groups.length).toBeGreaterThanOrEqual(11);
    for (const group of groups) {
      expect(group.getAttribute('role')).toBe('radiogroup');
      const name =
        group.getAttribute('aria-label') ??
        element.querySelector(`#${group.getAttribute('aria-labelledby')}`)?.textContent;
      expect(name?.trim(), group.outerHTML).toBeTruthy();
    }
  });

  describe('the examples', () => {
    it('checks a unit by a click on the text and on the hint, and ignores the disabled radio', async () => {
      const element = await render();
      const demo = demoAfter(element, 'basics');
      expect(outputs(demo)).toEqual(['kg']);
      await userEvent.click(demo.querySelector('ck-radio:nth-of-type(2) .ck-radio__label')!);
      await settle();
      expect(outputs(demo)).toEqual(['lb']);
      await userEvent.click(demo.querySelector('ck-radio:nth-of-type(1) .ck-radio__label')!);
      await userEvent.click(demo.querySelector('ck-radio:nth-of-type(2) ck-hint')!);
      await settle();
      expect(outputs(demo)).toEqual(['lb']);
      const stone = radioNamed(demo, 'Stone');
      expect(stone.disabled).toBe(true);
      stone.click();
      await settle();
      expect(outputs(demo)).toEqual(['lb']);
    });

    it('describes the radio by its own hint and the group by the group hint', async () => {
      const element = await render();
      const demo = demoAfter(element, 'basics');
      const [radioHint, groupHint] = Array.from(demo.querySelectorAll('ck-hint'));
      expect(radioNamed(demo, 'Pounds').getAttribute('aria-describedby')).toBe(radioHint.id);
      expect(demo.querySelector('ck-radio-group')!.getAttribute('aria-describedby')).toBe(
        groupHint.id,
      );
    });

    it('moves with the arrow keys and checks as it goes', async () => {
      const element = await render();
      const demo = demoAfter(element, 'basics');
      radioNamed(demo, 'Kilograms').focus();
      await userEvent.keyboard('{ArrowDown}');
      await settle();
      expect(outputs(demo)).toEqual(['lb']);
      await userEvent.keyboard('{ArrowDown}');
      await settle();
      expect(outputs(demo)).toEqual(['kg']);
    });

    it('lays the inline radios in one row and checks one', async () => {
      const element = await render();
      const demo = demoAfter(element, 'inline');
      const rows = Array.from(demo.querySelectorAll('.ck-radio'));
      expect(new Set(rows.map((row) => row.getBoundingClientRect().top)).size).toBe(1);
      expect(rows[2].getBoundingClientRect().left).toBeGreaterThan(
        rows[0].getBoundingClientRect().left,
      );
      expect(outputs(demo)).toEqual(['week']);
      await userEvent.click(radioNamed(demo, 'Month'));
      await settle();
      expect(outputs(demo)).toEqual(['month']);
    });

    it('shows the required error only after a touch or a submit, and announces it through describedby', async () => {
      const element = await render();
      const demo = demoAfter(element, 'required');
      const group = demo.querySelector('ck-radio-group')!;
      const inputs = Array.from(demo.querySelectorAll<HTMLInputElement>('.ck-radio__input'));
      const error = demo.querySelector<HTMLElement>('ck-error')!;
      expect(group.getAttribute('aria-required')).toBe('true');
      expect(group.querySelector('label .ck-radio-group__required')).not.toBeNull();
      expect(error.hidden).toBe(true);
      expect(inputs.some((input) => input.hasAttribute('aria-invalid'))).toBe(false);
      inputs[0].focus();
      await userEvent.tab();
      await settle();
      expect(document.activeElement).toBe(demo.querySelector('button[type="submit"]'));
      expect(error.hidden).toBe(false);
      for (const input of inputs) {
        expect(input.getAttribute('aria-invalid')).toBe('true');
      }
      expect(group.getAttribute('aria-describedby')).toContain(error.id);
      await userEvent.click(inputs[0]);
      await settle();
      expect(error.hidden).toBe(true);
      await userEvent.click(demo.querySelector('button[type="submit"]')!);
      await settle();
      expect(outputs(demo)).toEqual(['kg', 'saved']);
    });

    it('does not save until a unit is picked', async () => {
      const element = await render();
      const demo = demoAfter(element, 'required');
      await userEvent.click(demo.querySelector('button[type="submit"]')!);
      await settle();
      expect(outputs(demo)).toEqual(['none', 'not saved, no unit picked']);
      expect(demo.querySelector<HTMLElement>('ck-error')!.hidden).toBe(false);
      await userEvent.click(radioNamed(demo, 'Stone'));
      await settle();
      expect(demo.querySelector<HTMLElement>('ck-error')!.hidden).toBe(true);
      expect(outputs(demo)[0]).toBe('st');
    });

    it('matches a copied object with compareWith and writes the option object itself', async () => {
      const element = await render();
      const demo = demoAfter(element, 'objects');
      expect(checkedOf(demo)).toEqual([false, true, false]);
      await userEvent.click(radioNamed(demo, 'Tempo'));
      await settle();
      expect(checkedOf(demo)).toEqual([false, false, true]);
      expect(outputs(demo)).toEqual(['Tempo']);
    });

    it('keeps the three form demos in sync with their forms', async () => {
      const element = await render();
      const reactive = demoAfter(element, 'reactive-forms');
      expect(checkedOf(reactive)).toEqual([false, true]);
      await userEvent.click(radioNamed(reactive, 'Kilograms'));
      await settle();
      expect(outputs(reactive)).toEqual(['kg', 'no']);
      const buttons = reactive.querySelectorAll('.actions button');
      await userEvent.click(buttons[1]);
      await settle();
      expect(outputs(reactive)[0]).toBe('none');
      expect(checkedOf(reactive)).toEqual([false, false]);
      await userEvent.click(buttons[0]);
      await settle();
      expect(checkedOf(reactive)).toEqual([true, false]);
      await userEvent.click(buttons[2]);
      await settle();
      expect(radioNamed(reactive, 'Kilograms').disabled).toBe(true);

      const model = demoAfter(element, 'ng-model');
      expect(checkedOf(model)).toEqual([false, true]);
      await userEvent.click(radioNamed(model, 'Kilograms'));
      await settle();
      expect(outputs(model)).toEqual(['kg']);

      const signal = demoAfter(element, 'signal-forms');
      expect(checkedOf(signal)).toEqual([false, true]);
      await userEvent.click(radioNamed(signal, 'Kilograms'));
      await settle();
      expect(outputs(signal)).toEqual(['kg', 'no']);
    });

    it('shows the sizes at their control heights or more', async () => {
      const element = await render();
      const rows = Array.from(demoAfter(element, 'sizes').querySelectorAll('.ck-radio'));
      const heights = rows.map((row) => row.getBoundingClientRect().height);
      expect(heights[0]).toBeGreaterThanOrEqual(32);
      expect(heights[1]).toBeGreaterThanOrEqual(40);
      expect(heights[2]).toBeGreaterThanOrEqual(48);
      expect(heights[3]).toBeGreaterThanOrEqual(60);
    });

    it('blocks the disabled radio, the disabled group and the disabled fieldset', async () => {
      const element = await render();
      const demo = demoAfter(element, 'states');
      const inputs = Array.from(demo.querySelectorAll<HTMLInputElement>('.ck-radio__input'));
      expect(inputs).toHaveLength(7);
      expect(inputs.filter((input) => input.matches(':disabled'))).toHaveLength(6);
      for (const input of inputs.filter((candidate) => candidate.matches(':disabled'))) {
        const before = input.checked;
        input.click();
        await settle();
        expect(input.checked).toBe(before);
      }
      expect(inputs[2].checked).toBe(false);
      expect(inputs[3].checked).toBe(true);
    });

    it('puts the circle on the right in the right-to-left demo', async () => {
      const element = await render();
      const demo = demoAfter(element, 'rtl');
      const circle = demo.querySelector('.ck-radio__circle')!.getBoundingClientRect();
      const text = demo.querySelector('.ck-radio__label')!.getBoundingClientRect();
      expect(circle.left).toBeGreaterThan(text.left);
    });
  });

  describe('global resets', () => {
    function applyReset(css: string): void {
      const style = document.createElement('style');
      style.dataset['testReset'] = '';
      style.textContent = css;
      document.head.appendChild(style);
    }

    it('shows a reset that really breaks the input and the row', async () => {
      const element = await render();
      const row = demoAfter(element, 'basics').querySelector<HTMLElement>('.ck-radio')!;
      const input = row.querySelector<HTMLElement>('.ck-radio__input')!;
      expect(getComputedStyle(input).borderTopWidth).toBe('0px');
      expect(getComputedStyle(row).borderTopWidth).toBe('0px');
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(input).borderTopWidth).toBe('1px');
      expect(getComputedStyle(row).borderTopWidth).toBe('1px');
    });

    it('shows a reset that also hits the group label', async () => {
      const element = await render();
      const label = demoAfter(element, 'basics').querySelector<HTMLElement>(
        'ck-radio-group > label',
      )!;
      expect(getComputedStyle(label).borderTopWidth).toBe('0px');
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(label).borderTopWidth).toBe('1px');
    });

    it('shows a scoped reset that leaves the radio and the group label alone but still hits other controls', async () => {
      const element = await render();
      const row = demoAfter(element, 'basics').querySelector<HTMLElement>('.ck-radio')!;
      const input = row.querySelector<HTMLElement>('.ck-radio__input')!;
      const label = demoAfter(element, 'basics').querySelector<HTMLElement>(
        'ck-radio-group > label',
      )!;
      const foreignInput = document.createElement('input');
      element.appendChild(foreignInput);
      applyReset(RESET_SCOPED.split('/* Or declare')[0]);
      expect(getComputedStyle(input).borderTopWidth).toBe('0px');
      expect(getComputedStyle(row).borderTopWidth).toBe('0px');
      expect(getComputedStyle(label).borderTopWidth).toBe('0px');
      expect(getComputedStyle(foreignInput).borderTopWidth).toBe('1px');
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

    it('does not overflow the page at 390px, and every radio fits it', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const row of Array.from(element.querySelectorAll<HTMLElement>('.ck-radio'))) {
        expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(390);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, also with a radio checked', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      await userEvent.click(element.querySelector<HTMLElement>('.ck-radio__input')!);
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
    });

    it('has no axe violations with the error showing', async () => {
      setTestTheme(theme);
      const element = await render();
      const demo = demoAfter(element, 'required');
      demo.querySelector<HTMLInputElement>('.ck-radio__input')!.focus();
      demo.querySelector<HTMLElement>('button[type="submit"]')!.focus();
      await settle();
      await settleAnimations();
      expect(demo.querySelector<HTMLElement>('ck-error')!.hidden).toBe(false);
      await expectNoAxeViolations(element);
    });
  });
});
