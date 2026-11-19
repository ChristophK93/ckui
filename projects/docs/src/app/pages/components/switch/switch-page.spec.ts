import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkSwitch } from '@ckui/core/switch';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { SwitchPage } from './switch-page';
import { RESET_BREAKS, RESET_SCOPED, SAMPLES } from './switch-samples';

describe('SwitchPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [SwitchPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(SwitchPage);
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

  const switchNamed = (element: HTMLElement, name: string): HTMLInputElement =>
    Array.from(element.querySelectorAll<HTMLElement>('ck-switch'))
      .find((candidate) => candidate.textContent?.trim().startsWith(name))!
      .querySelector<HTMLInputElement>('.ck-switch__input')!;
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
      'hint',
      'position',
      'reactive',
      'template',
      'signal',
      'sizes',
      'states',
      'noText',
      'settings',
    ]);
    const needs: [string, string][] = [
      ['Component', '@angular/core'],
      ['signal', '@angular/core'],
      ['CK_SWITCH_IMPORTS', '@ckui/core/switch'],
      ['FormControl', '@angular/forms'],
      ['ReactiveFormsModule', '@angular/forms'],
      ['FormsModule', '@angular/forms'],
      ['FormField', '@angular/forms/signals'],
      ['form', '@angular/forms/signals'],
    ];
    for (const [name, sample] of typescript) {
      const importLines = sample.split('\n').filter((line) => line.startsWith('import '));
      const body = sample
        .split('\n')
        .filter((line) => !line.startsWith('import '))
        .join('\n');
      for (const [identifier, module] of needs) {
        // `signal` is also a word in `Signal Forms` comments and `form` in `[formControl]`.
        const usage =
          identifier === 'signal'
            ? /\bsignal[<(]/
            : identifier === 'form'
              ? /\bform\(/
              : new RegExp(`\\b${identifier}\\b`);
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
      expect(sample, name).toMatch(/imports: \[[^\]]*CK_SWITCH_IMPORTS[^\]]*\]/);
      // Every template name is declared, so the sample compiles as copied.
      for (const [, used] of Array.from(
        body.matchAll(
          /\[\(?(?:value|ngModel)\)?\]="([A-Za-z_]\w*)(?:\(\))?"|\[(?:formControl|formField)\]="([A-Za-z_]\w*)/g,
        ),
        (match) => [match[0], match[1] ?? match[2]],
      ).filter(([, used]) => used !== 'true' && used !== 'false')) {
        expect(body, `${name} declares ${used}`).toMatch(
          new RegExp(`(readonly |protected |private )+${used}\\b|\\b${used} =`),
        );
      }
      // A switch without visible text carries a name.
      for (const match of body.matchAll(/<ck-switch\b[^>]*\/>/g)) {
        expect(match[0], name).toMatch(/aria-label(ledby)?=/);
      }
    }
    // State that changes after a callback is a signal, so the samples work in a zoneless app.
    for (const name of ['basics', 'hint', 'position', 'noText', 'settings'] as const) {
      expect(SAMPLES[name], name).toContain("import { Component, signal } from '@angular/core'");
      expect(SAMPLES[name], name).toMatch(/\[\(value\)\]="\w+"/);
    }
    expect(SAMPLES.hint).toContain('<ck-hint>');
    expect(SAMPLES.reactive).toContain('[formControl]="audio"');
    expect(SAMPLES.template).toContain('[(ngModel)]="audio"');
    expect(SAMPLES.signal).toContain('[formField]="settings.audio"');
    expect(SAMPLES.sizes).toContain('size="xl"');
    expect(SAMPLES.position).toContain('labelPosition="end"');
    expect(SAMPLES.states).toContain('<fieldset disabled>');
    expect(SAMPLES.tokens).toContain('--ck-switch-track-on');
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

  it('documents every input of the switch and of its hint', async () => {
    const element = await render();
    const tables = Array.from(element.querySelectorAll('#api ~ .table-scroll'));
    const documented = (index: number): string[] =>
      Array.from(tables[index].querySelectorAll('tbody tr'), (row) =>
        row.querySelector('th')!.textContent!.trim(),
      ).sort();
    const declared = (type: typeof CkSwitch): string[] =>
      reflectComponentType(type)!
        .inputs.map((input) => input.templateName)
        .sort();
    expect(documented(0)).toEqual(declared(CkSwitch));
    // A directive has no component metadata, so its one input is checked by name.
    expect(documented(1)).toEqual(['id']);
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('names every switch on the page', async () => {
    const element = await render();
    const inputs = Array.from(element.querySelectorAll<HTMLInputElement>('.ck-switch__input'));
    expect(inputs.length).toBeGreaterThanOrEqual(15);
    for (const input of inputs) {
      const label = input.getAttribute('aria-label');
      const labelledby = input.getAttribute('aria-labelledby');
      const name = label ?? element.querySelector(`#${labelledby}`)?.textContent;
      expect(name?.trim(), input.outerHTML).toBeTruthy();
    }
  });

  describe('the examples', () => {
    it('toggles auto-upload by a click on the text and shows the state', async () => {
      const element = await render();
      const demo = demoAfter(element, 'basics');
      expect(demo.querySelector('output')!.textContent).toBe('off');
      await userEvent.click(demo.querySelector('.ck-switch__text')!);
      await settle();
      expect(demo.querySelector('output')!.textContent).toBe('on');
      expect(demo.querySelector<HTMLInputElement>('.ck-switch__input')!.checked).toBe(true);
    });

    it('toggles by a click on the hint', async () => {
      const element = await render();
      const demo = demoAfter(element, 'hint');
      const input = demo.querySelector<HTMLInputElement>('.ck-switch__input')!;
      expect(input.checked).toBe(true);
      await userEvent.click(demo.querySelector('ck-hint')!);
      await settle();
      expect(input.checked).toBe(false);
      expect(input.getAttribute('aria-describedby')).toBe(demo.querySelector('ck-hint')!.id);
    });

    it('puts the switch before the text with labelPosition end', async () => {
      const element = await render();
      const [start, end] = Array.from(
        demoAfter(element, 'label-position').querySelectorAll('ck-switch'),
      );
      const place = (host: Element) => ({
        track: host.querySelector('.ck-switch__track')!.getBoundingClientRect().left,
        text: host.querySelector('.ck-switch__text')!.getBoundingClientRect().left,
      });
      expect(place(start).text).toBeLessThan(place(start).track);
      expect(place(end).track).toBeLessThan(place(end).text);
    });

    it('keeps the three form demos in sync with their forms', async () => {
      const element = await render();
      const reactive = switchNamed(element, 'Audio cues, Reactive Forms');
      const demo = demoAfter(element, 'reactive-forms');
      expect(reactive.checked).toBe(true);
      await userEvent.click(reactive);
      await settle();
      expect(demo.querySelectorAll('output')[0].textContent).toBe('false');
      expect(demo.querySelectorAll('output')[1].textContent).toBe('yes');
      await userEvent.click(demo.querySelectorAll('.actions button')[0]);
      await settle();
      expect(reactive.checked).toBe(false);
      await userEvent.click(demo.querySelectorAll('.actions button')[1]);
      await settle();
      expect(reactive.checked).toBe(false);
      expect(demo.querySelectorAll('output')[0].textContent).toBe('none');
      await userEvent.click(demo.querySelectorAll('.actions button')[2]);
      await settle();
      expect(reactive.disabled).toBe(true);

      const model = switchNamed(element, 'Audio cues, ngModel');
      await userEvent.click(model);
      await settle();
      expect(demoAfter(element, 'ng-model').querySelector('output')!.textContent).toBe('false');

      const signal = switchNamed(element, 'Audio cues, Signal Forms');
      await userEvent.click(signal);
      await settle();
      expect(demoAfter(element, 'signal-forms').querySelector('output')!.textContent).toBe('false');
    });

    it('shows the four sizes at their control heights or more', async () => {
      const element = await render();
      const heights = Array.from(demoAfter(element, 'sizes').querySelectorAll('.ck-switch')).map(
        (row) => row.getBoundingClientRect().height,
      );
      expect(heights).toHaveLength(4);
      expect(heights[0]).toBeGreaterThanOrEqual(32);
      expect(heights[1]).toBeGreaterThanOrEqual(40);
      expect(heights[2]).toBeGreaterThanOrEqual(48);
      expect(heights[3]).toBeGreaterThanOrEqual(60);
    });

    it('blocks the disabled switches, also inside the disabled fieldset', async () => {
      const element = await render();
      const demo = demoAfter(element, 'states');
      const inputs = Array.from(demo.querySelectorAll<HTMLInputElement>('.ck-switch__input'));
      expect(inputs).toHaveLength(3);
      for (const input of inputs) {
        expect(input.matches(':disabled')).toBe(true);
        const before = input.checked;
        input.click();
        await settle();
        expect(input.checked).toBe(before);
      }
    });

    it('names the switch without text through aria-label and toggles it', async () => {
      const element = await render();
      const input = element.querySelector<HTMLInputElement>('.ck-switch__input[aria-label]')!;
      expect(input.getAttribute('aria-label')).toBe('Audio cues, no text');
      expect(input.hasAttribute('aria-labelledby')).toBe(false);
      await userEvent.click(input);
      await settle();
      expect(demoAfter(element, 'no-text').querySelector('output')!.textContent).toBe('false');
    });

    it('recreates the settings list: three rows, two with a hint', async () => {
      const element = await render();
      const rows = Array.from(element.querySelectorAll<HTMLElement>('.settings ck-switch'));
      expect(rows).toHaveLength(3);
      expect(rows.filter((row) => row.querySelector('ck-hint'))).toHaveLength(2);
      const tools = rows[0].querySelector<HTMLInputElement>('.ck-switch__input')!;
      expect(tools.checked).toBe(false);
      await userEvent.click(rows[0].querySelector('.ck-switch__text')!);
      await settle();
      expect(tools.checked).toBe(true);
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
      const row = demoAfter(element, 'basics').querySelector<HTMLElement>('.ck-switch')!;
      const input = row.querySelector<HTMLElement>('.ck-switch__input')!;
      expect(getComputedStyle(input).borderTopWidth).toBe('0px');
      expect(getComputedStyle(row).borderTopWidth).toBe('0px');
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(input).borderTopWidth).toBe('1px');
      expect(getComputedStyle(row).borderTopWidth).toBe('1px');
    });

    it('shows a scoped reset that leaves the switch alone but still hits other controls', async () => {
      const element = await render();
      const row = demoAfter(element, 'basics').querySelector<HTMLElement>('.ck-switch')!;
      const input = row.querySelector<HTMLElement>('.ck-switch__input')!;
      const foreignInput = document.createElement('input');
      element.appendChild(foreignInput);
      applyReset(RESET_SCOPED.split('/* Or declare')[0]);
      expect(getComputedStyle(input).borderTopWidth).toBe('0px');
      expect(getComputedStyle(row).borderTopWidth).toBe('0px');
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

    it('does not overflow the page at 390px, and every switch fits it', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const row of Array.from(element.querySelectorAll<HTMLElement>('.ck-switch'))) {
        expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(390);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, also with a switch toggled', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      await userEvent.click(element.querySelector<HTMLElement>('.settings .ck-switch__input')!);
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
    });
  });
});
