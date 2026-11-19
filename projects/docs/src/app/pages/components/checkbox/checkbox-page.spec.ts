import { ApplicationRef, Type, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkCheckbox, CkCheckboxGroup } from '@ckui/core/checkbox';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { CheckboxPage } from './checkbox-page';
import { RESET_BREAKS, RESET_SCOPED, SAMPLES } from './checkbox-samples';

describe('CheckboxPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [CheckboxPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CheckboxPage);
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

  const checkboxNamed = (element: HTMLElement, name: string): HTMLInputElement =>
    Array.from(element.querySelectorAll<HTMLElement>('ck-checkbox'))
      .find((candidate) => candidate.textContent?.trim().startsWith(name))!
      .querySelector<HTMLInputElement>('.ck-checkbox__input')!;
  const demoAfter = (element: HTMLElement, id: string): HTMLElement =>
    element.querySelector<HTMLElement>(`#${id} ~ .demo`)!;
  const outputs = (demo: HTMLElement): string[] =>
    Array.from(demo.querySelectorAll('output'), (output) => output.textContent!);

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
      'position',
      'selectAll',
      'terms',
      'group',
      'objects',
      'reactive',
      'template',
      'signal',
      'sizes',
      'states',
      'noText',
      'rtl',
    ]);
    const needs: [string, RegExp, string][] = [
      ['Component', /\bComponent\b/, '@angular/core'],
      ['signal', /\bsignal[<(]/, '@angular/core'],
      ['computed', /\bcomputed\(/, '@angular/core'],
      ['CK_CHECKBOX_IMPORTS', /\bCK_CHECKBOX_IMPORTS\b/, '@ckui/core/checkbox'],
      ['CkButton', /\bckButton\b/, '@ckui/core/button'],
      ['FormControl', /\bnew FormControl\b/, '@angular/forms'],
      ['FormGroup', /\bnew FormGroup\b/, '@angular/forms'],
      ['Validators', /\bValidators\.\w+\(?/, '@angular/forms'],
      ['ReactiveFormsModule', /\[(formControl|formGroup)\]|formControlName/, '@angular/forms'],
      ['FormsModule', /\[\(ngModel\)\]/, '@angular/forms'],
      ['FormField', /\[formField\]/, '@angular/forms/signals'],
      ['form', /(?<![.\w])form\(/, '@angular/forms/signals'],
      ['minLength', /(?<![.\w])minLength\(/, '@angular/forms/signals'],
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
      expect(sample, name).toMatch(/imports: \[[^\]]*CK_CHECKBOX_IMPORTS[^\]]*\]/);
      // Every template name is declared, so the sample compiles as copied.
      const bound = Array.from(
        body.matchAll(
          /\[\(?(?:value|ngModel|indeterminate)\)?\]="([A-Za-z_]\w*)(?:\(\))?"|\[(?:formControl|formField|formGroup)\]="([A-Za-z_]\w*)|formControlName="(\w+)"/g,
        ),
        (match) => match[1] ?? match[2] ?? match[3],
      ).filter((used) => !['true', 'false'].includes(used));
      for (const used of bound) {
        expect(body, `${name} declares ${used}`).toMatch(
          new RegExp(`(readonly |protected |private )+${used}\\b|\\b${used} =|\\b${used}: `),
        );
      }
      // A checkbox without visible text carries a name.
      for (const match of body.matchAll(/<ck-checkbox\b[^>]*\/>/g)) {
        expect(match[0], name).toMatch(/aria-label(ledby)?=/);
      }
    }
    // State that changes after a callback is a signal, so the samples work in a zoneless app.
    for (const name of ['basics', 'position', 'noText', 'rtl'] as const) {
      expect(SAMPLES[name], name).toContain("import { Component, signal } from '@angular/core'");
      expect(SAMPLES[name], name).toMatch(/\[\(value\)\]="\w+"/);
    }
    expect(SAMPLES.basics).toContain('<ck-hint>');
    expect(SAMPLES.position).toContain('labelPosition="start"');
    expect(SAMPLES.selectAll).toContain('[indeterminate]="some()"');
    expect(SAMPLES.selectAll).toContain('[option]="ride"');
    expect(SAMPLES.terms).toContain('Validators.requiredTrue');
    expect(SAMPLES.terms).toContain('<ck-error>');
    expect(SAMPLES.group).toContain('Validators.required');
    expect(SAMPLES.group).toContain('<ck-error>');
    expect(SAMPLES.reactive).toContain('[formControl]="template"');
    expect(SAMPLES.template).toContain('[(ngModel)]="zones"');
    expect(SAMPLES.signal).toContain('[formField]="plan.zones"');
    expect(SAMPLES.sizes).toContain('size="xl"');
    expect(SAMPLES.states).toContain('<fieldset disabled>');
    expect(SAMPLES.rtl).toContain('dir="rtl"');
    expect(SAMPLES.tokens).toContain('--ck-checkbox-checked-bg');
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

  it('documents every input of the checkbox, the group and the hint and error', async () => {
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
    expect(documented(0)).toEqual(declared(CkCheckbox));
    expect(documented(1)).toEqual(declared(CkCheckboxGroup));
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

  it('names every checkbox and every group on the page', async () => {
    const element = await render();
    const inputs = Array.from(element.querySelectorAll<HTMLInputElement>('.ck-checkbox__input'));
    expect(inputs.length).toBeGreaterThanOrEqual(25);
    for (const input of inputs) {
      const label = input.getAttribute('aria-label');
      const labelledby = input.getAttribute('aria-labelledby');
      const name = label ?? element.querySelector(`#${labelledby}`)?.textContent;
      expect(name?.trim(), input.outerHTML).toBeTruthy();
    }
    const groups = Array.from(element.querySelectorAll('ck-checkbox-group'));
    expect(groups.length).toBeGreaterThanOrEqual(8);
    for (const group of groups) {
      const name =
        group.getAttribute('aria-label') ??
        element.querySelector(`#${group.getAttribute('aria-labelledby')}`)?.textContent;
      expect(name?.trim(), group.outerHTML).toBeTruthy();
    }
  });

  describe('the examples', () => {
    it('toggles save as template by a click on the text and by a click on the hint', async () => {
      const element = await render();
      const demo = demoAfter(element, 'basics');
      expect(outputs(demo)).toEqual(['off']);
      await userEvent.click(demo.querySelector('.ck-checkbox__text')!);
      await settle();
      expect(outputs(demo)).toEqual(['on']);
      await userEvent.click(demo.querySelector('ck-hint')!);
      await settle();
      expect(outputs(demo)).toEqual(['off']);
      expect(demo.querySelector('input')!.getAttribute('aria-describedby')).toBe(
        demo.querySelector('ck-hint')!.id,
      );
    });

    it('puts the text first with labelPosition start', async () => {
      const element = await render();
      const [end, start] = Array.from(
        demoAfter(element, 'label-position').querySelectorAll('ck-checkbox'),
      );
      const place = (host: Element) => ({
        box: host.querySelector('.ck-checkbox__box')!.getBoundingClientRect().left,
        text: host.querySelector('.ck-checkbox__text')!.getBoundingClientRect().left,
      });
      expect(place(end).box).toBeLessThan(place(end).text);
      expect(place(start).text).toBeLessThan(place(start).box);
    });

    it('drives the select-all box from the list: mixed, all, none', async () => {
      const element = await render();
      const demo = demoAfter(element, 'select-all');
      const all = demo.querySelector<HTMLInputElement>('ck-checkbox .ck-checkbox__input')!;
      const rides = Array.from(
        demo.querySelectorAll<HTMLInputElement>('ck-checkbox-group .ck-checkbox__input'),
      );
      expect(rides.map((ride) => ride.checked)).toEqual([false, true, false]);
      expect(all.indeterminate).toBe(true);
      expect(all.checked).toBe(false);
      await userEvent.click(all);
      await settle();
      expect(rides.every((ride) => ride.checked)).toBe(true);
      expect(all.indeterminate).toBe(false);
      expect(all.checked).toBe(true);
      await userEvent.click(all);
      await settle();
      expect(rides.some((ride) => ride.checked)).toBe(false);
      expect(all.checked).toBe(false);
      expect(all.indeterminate).toBe(false);
      await userEvent.click(rides[2]);
      await settle();
      expect(all.indeterminate).toBe(true);
      expect(outputs(demo)).toEqual(['Recovery spin']);
    });

    it('shows the terms error only after a touch or a submit, and announces it through describedby', async () => {
      const element = await render();
      const demo = demoAfter(element, 'terms');
      const input = demo.querySelector<HTMLInputElement>('.ck-checkbox__input')!;
      const error = demo.querySelector<HTMLElement>('ck-error')!;
      expect(error.hidden).toBe(true);
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      await userEvent.click(demo.querySelector('button[type="submit"]')!);
      await settle();
      expect(error.hidden).toBe(false);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
      expect(outputs(demo)).toEqual(['not sent, the terms are not accepted']);
      await userEvent.click(input);
      await settle();
      expect(error.hidden).toBe(true);
      await userEvent.click(demo.querySelector('button[type="submit"]')!);
      await settle();
      expect(outputs(demo)).toEqual(['sent']);
    });

    it('shows the group error once, and only after focus left the whole group', async () => {
      const element = await render();
      const demo = demoAfter(element, 'group');
      const inputs = Array.from(demo.querySelectorAll<HTMLInputElement>('.ck-checkbox__input'));
      const error = demo.querySelector<HTMLElement>('ck-error')!;
      expect(inputs).toHaveLength(3);
      inputs[0].focus();
      await userEvent.tab();
      await userEvent.tab();
      await settle();
      expect(error.hidden).toBe(true);
      await userEvent.tab();
      await settle();
      expect(document.activeElement).toBe(demo.querySelector('button[type="submit"]'));
      expect(error.hidden).toBe(false);
      for (const input of inputs) {
        expect(input.getAttribute('aria-invalid')).toBe('true');
      }
      expect(demo.querySelector('ck-checkbox-group')!.getAttribute('aria-describedby')).toContain(
        error.id,
      );
      await userEvent.click(inputs[2]);
      await userEvent.click(inputs[0]);
      await settle();
      expect(error.hidden).toBe(true);
      expect(outputs(demo)[0]).toBe('endurance, tempo');
      await userEvent.click(demo.querySelector('button[type="submit"]')!);
      await settle();
      expect(outputs(demo)[1]).toBe('saved');
    });

    it('marks the group label as required', async () => {
      const element = await render();
      const label = demoAfter(element, 'group').querySelector('ck-checkbox-group > label')!;
      expect(label.querySelector('.ck-checkbox-group__required')).not.toBeNull();
      expect(
        demoAfter(element, 'group')
          .querySelector('ck-checkbox-group')!
          .hasAttribute('aria-required'),
      ).toBe(false);
    });

    it('compares object options by identity', async () => {
      const element = await render();
      const demo = demoAfter(element, 'objects');
      const inputs = Array.from(demo.querySelectorAll<HTMLInputElement>('.ck-checkbox__input'));
      expect(inputs.map((input) => input.checked)).toEqual([false, true, false]);
      await userEvent.click(inputs[2]);
      await userEvent.click(inputs[0]);
      await settle();
      expect(outputs(demo)).toEqual(['Endurance, VO2max, Tempo']);
    });

    it('keeps the three form demos in sync with their forms', async () => {
      const element = await render();
      const reactive = checkboxNamed(element, 'Save as template, Reactive Forms');
      const demo = demoAfter(element, 'reactive-forms');
      expect(reactive.checked).toBe(true);
      await userEvent.click(reactive);
      await settle();
      expect(outputs(demo)).toEqual(['false', 'vo2', 'no']);
      const buttons = demo.querySelectorAll('.actions button');
      await userEvent.click(buttons[1]);
      await settle();
      expect(outputs(demo)[1]).toBe('none');
      expect(
        Array.from(demo.querySelectorAll<HTMLInputElement>('ck-checkbox-group input')).some(
          (input) => input.checked,
        ),
      ).toBe(false);
      await userEvent.click(buttons[0]);
      await settle();
      expect(reactive.checked).toBe(false);
      await userEvent.click(buttons[2]);
      await settle();
      expect(reactive.disabled).toBe(true);

      const model = checkboxNamed(element, 'Save as template, ngModel');
      await userEvent.click(model);
      await userEvent.click(
        demoAfter(element, 'ng-model').querySelectorAll<HTMLInputElement>(
          'ck-checkbox-group input',
        )[0],
      );
      await settle();
      expect(outputs(demoAfter(element, 'ng-model'))).toEqual(['false', 'endurance, vo2']);

      const signal = checkboxNamed(element, 'Save as template, Signal Forms');
      await userEvent.click(signal);
      await userEvent.click(
        demoAfter(element, 'signal-forms').querySelectorAll<HTMLInputElement>(
          'ck-checkbox-group input',
        )[0],
      );
      await settle();
      expect(outputs(demoAfter(element, 'signal-forms'))).toEqual([
        'false',
        'endurance, vo2',
        'no',
      ]);
    });

    it('shows the sizes at their control heights or more, and the group size as a default', async () => {
      const element = await render();
      const demo = demoAfter(element, 'sizes');
      const rows = Array.from(demo.querySelectorAll('.ck-checkbox'));
      const heights = rows.slice(0, 4).map((row) => row.getBoundingClientRect().height);
      expect(heights[0]).toBeGreaterThanOrEqual(32);
      expect(heights[1]).toBeGreaterThanOrEqual(40);
      expect(heights[2]).toBeGreaterThanOrEqual(48);
      expect(heights[3]).toBeGreaterThanOrEqual(60);
      expect(rows[4].classList.contains('ck-checkbox--lg')).toBe(true);
      expect(rows[5].classList.contains('ck-checkbox--sm')).toBe(true);
    });

    it('blocks the disabled checkboxes, the disabled group and the disabled fieldset', async () => {
      const element = await render();
      const demo = demoAfter(element, 'states');
      const inputs = Array.from(demo.querySelectorAll<HTMLInputElement>('.ck-checkbox__input'));
      expect(inputs).toHaveLength(6);
      for (const input of inputs) {
        expect(input.matches(':disabled')).toBe(true);
        const before = input.checked;
        input.click();
        await settle();
        expect(input.checked).toBe(before);
      }
      expect(inputs[3].checked).toBe(true);
    });

    it('names the checkbox without text through aria-label and toggles it', async () => {
      const element = await render();
      const input = element.querySelector<HTMLInputElement>('.ck-checkbox__input[aria-label]')!;
      expect(input.getAttribute('aria-label')).toBe('Select this ride, no text');
      expect(input.hasAttribute('aria-labelledby')).toBe(false);
      await userEvent.click(input);
      await settle();
      expect(outputs(demoAfter(element, 'no-text'))).toEqual(['false']);
    });

    it('puts the box on the right in the right-to-left demo', async () => {
      const element = await render();
      const demo = demoAfter(element, 'rtl');
      const box = demo.querySelector('.ck-checkbox__box')!.getBoundingClientRect();
      const text = demo.querySelector('.ck-checkbox__text')!.getBoundingClientRect();
      expect(box.left).toBeGreaterThan(text.left);
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
      const row = demoAfter(element, 'basics').querySelector<HTMLElement>('.ck-checkbox')!;
      const input = row.querySelector<HTMLElement>('.ck-checkbox__input')!;
      expect(getComputedStyle(input).borderTopWidth).toBe('0px');
      expect(getComputedStyle(row).borderTopWidth).toBe('0px');
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(input).borderTopWidth).toBe('1px');
      expect(getComputedStyle(row).borderTopWidth).toBe('1px');
    });

    it('shows a reset that also hits the group label', async () => {
      const element = await render();
      const label = demoAfter(element, 'group').querySelector<HTMLElement>(
        'ck-checkbox-group > label',
      )!;
      expect(getComputedStyle(label).borderTopWidth).toBe('0px');
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(label).borderTopWidth).toBe('1px');
    });

    it('shows a scoped reset that leaves the checkbox and the group label alone but still hits other controls', async () => {
      const element = await render();
      const row = demoAfter(element, 'basics').querySelector<HTMLElement>('.ck-checkbox')!;
      const input = row.querySelector<HTMLElement>('.ck-checkbox__input')!;
      const label = demoAfter(element, 'group').querySelector<HTMLElement>(
        'ck-checkbox-group > label',
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

    it('does not overflow the page at 390px, and every checkbox fits it', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const row of Array.from(element.querySelectorAll<HTMLElement>('.ck-checkbox'))) {
        expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(390);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, also with a box toggled and the error showing', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      const demo = demoAfter(element, 'terms');
      await userEvent.click(demo.querySelector('button[type="submit"]')!);
      await userEvent.click(element.querySelector<HTMLElement>('.ck-checkbox__input')!);
      await settle();
      await settleAnimations();
      expect(demo.querySelector<HTMLElement>('ck-error')!.hidden).toBe(false);
      await expectNoAxeViolations(element);
    });
  });
});
