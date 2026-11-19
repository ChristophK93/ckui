import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkOptgroup, CkOption, CkSelect } from '@ckui/core/select';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { SelectPage } from './select-page';
import { RESET_BREAKS, RESET_SCOPED, SAMPLES } from './select-samples';

describe('SelectPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [SelectPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(SelectPage);
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

  const triggerNamed = (element: HTMLElement, name: string): HTMLButtonElement => {
    const trigger = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.ck-select__trigger'),
    ).find(
      (candidate) =>
        candidate.getAttribute('aria-label') === name ||
        Array.from(candidate.labels ?? []).some((label) =>
          label.textContent!.trim().startsWith(name),
        ),
    );
    if (!trigger) {
      throw new Error(`No select named ${name}`);
    }
    return trigger;
  };
  const standaloneTrigger = (element: HTMLElement): HTMLButtonElement =>
    demoAfter(element, 'standalone').querySelector<HTMLButtonElement>('.ck-select__trigger')!;
  const demoAfter = (element: HTMLElement, id: string): HTMLElement =>
    element.querySelector<HTMLElement>(`#${id} ~ .demo`)!;
  const key = (target: Element, name: string): void => {
    // A popover closes when its anchor is out of view, so a demo further down is scrolled to first.
    if (target.matches('.ck-select__trigger')) {
      target.scrollIntoView({ block: 'center' });
    }
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
    );
  };
  const outputs = (demo: Element): string[] =>
    Array.from(demo.querySelectorAll('output'), (output) => output.textContent!);
  /** Opens the list of a select that is further down the page: a popover closes when its anchor is out of view. */
  async function open(trigger: HTMLButtonElement): Promise<void> {
    trigger.scrollIntoView({ block: 'center' });
    trigger.focus();
    trigger.click();
    await settle();
  }
  const options = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('.ck-select-listbox ck-option')).filter(
      (option) => !option.hidden,
    );
  const wait = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

  afterEach(async () => {
    document.body.replaceChildren();
    document.head.querySelectorAll('style[data-test-reset]').forEach((style) => style.remove());
    resetTestTheme();
    await wait(30);
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
      'standalone',
      'groups',
      'rich',
      'filter',
      'filterWith',
      'disabled',
      'objects',
      'reactive',
      'template',
      'signal',
      'sizes',
    ]);
    const needs: [string, string, RegExp?][] = [
      ['Component', '@angular/core'],
      ['signal', '@angular/core', /\bsignal[<(]/],
      ['CK_SELECT_IMPORTS', '@ckui/core/select'],
      ['CK_FIELD_IMPORTS', '@ckui/core/field'],
      ['FormControl', '@angular/forms', /\bnew FormControl\b/],
      ['ReactiveFormsModule', '@angular/forms', /\[formControl\]/],
      ['FormsModule', '@angular/forms', /\[\(ngModel\)\]/],
      ['Validators', '@angular/forms', /\bValidators\./],
      ['FormField', '@angular/forms/signals', /\[formField\]/],
      ['form', '@angular/forms/signals', /\bform\(/],
      ['required', '@angular/forms/signals', /\brequired\(/],
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
      expect(sample, name).toMatch(/imports: \[[^\]]*CK_SELECT_IMPORTS[^\]]*\]/);
      expect(sample, name).toMatch(/aria-label(ledby)?=|<label>/);
      // Every name a template binds or loops over is declared, so the sample compiles as copied.
      const loopVariables = Array.from(body.matchAll(/@for \((\w+) of/g), (match) => match[1]);
      for (const [, used] of Array.from(
        body.matchAll(
          /\[\(?(?:value|ngModel|compareWith|filterWith|formControl|formField)\)?\]="(?!null")([A-Za-z_]\w*)|@for \(\w+ of ([A-Za-z_]\w*);/g,
        ),
        (match) => [match[0], match[1] ?? match[2]] as const,
      ).filter(([, used]) => !loopVariables.includes(used))) {
        expect(body, `${name} declares ${used}`).toMatch(
          new RegExp(`(readonly |protected |private )+${used}\\b|\\b${used} =`),
        );
      }
    }
    // State that changes after a callback is a signal, so the samples work in a zoneless app.
    for (const name of [
      'basics',
      'standalone',
      'groups',
      'rich',
      'filter',
      'filterWith',
      'objects',
      'signal',
    ] as const) {
      expect(SAMPLES[name], name).toContain('signal');
    }
    expect(SAMPLES.basics).toContain('<ck-hint>');
    expect(SAMPLES.filter).toContain(' filter ');
    expect(SAMPLES.filterWith).toContain('[filterWith]="matches"');
    expect(SAMPLES.objects).toContain('[compareWith]="sameZone"');
    expect(SAMPLES.rich).toContain('ckSelectValue let-option');
    expect(SAMPLES.reactive).toContain('[formControl]="kind"');
    expect(SAMPLES.template).toContain('[(ngModel)]="kind"');
    expect(SAMPLES.signal).toContain('[formField]="settings.kind"');
    expect(SAMPLES.sizes).toContain('size="xl"');
    expect(SAMPLES.tokens).toContain('--ck-option-bg-selected');
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

  it('documents every input of the select, the option and the group', async () => {
    const element = await render();
    const tables = Array.from(element.querySelectorAll('#api ~ .table-scroll'));
    const documented = (index: number) =>
      Array.from(tables[index].querySelectorAll('tbody tr'), (row) =>
        row.querySelector('th')!.textContent!.trim(),
      ).sort();
    const declared = (type: Parameters<typeof reflectComponentType>[0]) =>
      reflectComponentType(type)!
        .inputs.map((input) => input.templateName)
        .sort();
    expect(documented(0)).toEqual(declared(CkSelect));
    expect(documented(1)).toEqual(declared(CkOption));
    expect(documented(2)).toEqual(declared(CkOptgroup));
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('names every select on the page', async () => {
    const element = await render();
    const triggers = Array.from(element.querySelectorAll<HTMLButtonElement>('[role="combobox"]'));
    expect(triggers.length).toBeGreaterThanOrEqual(14);
    for (const trigger of triggers) {
      const name =
        trigger.getAttribute('aria-label') ??
        Array.from(trigger.labels ?? [], (label) => label.textContent).join(' ');
      expect(name?.trim(), trigger.outerHTML).toBeTruthy();
    }
  });

  describe('the examples', () => {
    it('picks a target in the field, lifts the label and skips the disabled option', async () => {
      const element = await render();
      const demo = demoAfter(element, 'basics');
      const trigger = triggerNamed(element, 'Target');
      expect(outputs(demo)).toEqual(['none']);
      await open(trigger);
      expect(options().map((option) => option.textContent!.trim())).toEqual([
        '% FTP',
        'Watts',
        'Level',
        'Free',
      ]);
      options()[3].click();
      options()[1].click();
      await settle();
      expect(outputs(demo)).toEqual(['watt']);
      expect(trigger.textContent).toContain('Watts');
      expect(trigger.getAttribute('aria-describedby')).toBe(demo.querySelector('ck-hint')!.id);
      expect(demo.querySelector('ck-field')!.classList.contains('ck-field--floated')).toBe(true);
    });

    it('opens and picks from the keyboard in the standalone select', async () => {
      const element = await render();
      const demo = demoAfter(element, 'standalone');
      const trigger = demo.querySelector<HTMLButtonElement>('.ck-select__trigger')!;
      key(trigger, 'ArrowDown');
      await settle();
      key(trigger, 'ArrowDown');
      key(trigger, 'Enter');
      await settle();
      expect(outputs(demo)).toEqual(['level']);
    });

    it('shows groups with titles and keeps a disabled group and option out of reach', async () => {
      const element = await render();
      const demo = demoAfter(element, 'groups');
      const trigger = demo.querySelector<HTMLButtonElement>('.ck-select__trigger')!;
      await open(trigger);
      const groups = Array.from(document.querySelectorAll('ck-optgroup'), (group) =>
        group.querySelector('.ck-optgroup__label')!.textContent!.trim(),
      );
      expect(groups).toEqual(['Endurance', 'Intervals', 'Rest']);
      options().at(-1)!.click();
      await settle();
      expect(outputs(demo)).toEqual(['none']);
      key(trigger, 'End');
      key(trigger, 'Enter');
      await settle();
      expect(outputs(demo)).toEqual(['vo2']);
    });

    it('draws rich rows, and the selected one through the value template', async () => {
      const element = await render();
      const demo = demoAfter(element, 'rich');
      const trigger = demo.querySelector<HTMLButtonElement>('.ck-select__trigger')!;
      expect(trigger.querySelector('strong')!.textContent).toBe('Sweet spot 60 min · 240 W');
      await open(trigger);
      expect(document.querySelectorAll('.ck-option .meta')).toHaveLength(3);
      options()[0].click();
      await settle();
      expect(outputs(demo)).toEqual(['zone2']);
      expect(trigger.querySelector('strong')!.textContent).toBe('Zone 2 90 min · 180 W');
    });

    it('filters the countries, ignoring accents, and selects the first match with Enter', async () => {
      const element = await render();
      const demo = demoAfter(element, 'filter');
      await open(demo.querySelector<HTMLButtonElement>('.ck-select__trigger')!);
      expect(options()).toHaveLength(30);
      await userEvent.keyboard('TURK');
      await settle();
      expect(options().map((option) => option.textContent!.trim())).toEqual(['Türkiye']);
      await userEvent.keyboard('{Enter}');
      await settle();
      expect(outputs(demo)).toEqual(['Türkiye']);
    });

    it('matches by code with filterWith, which the default match would not', async () => {
      const element = await render();
      const trigger = triggerNamed(element, 'Country by name or code');
      await open(trigger);
      await userEvent.keyboard('de');
      await settle();
      expect(options().map((option) => option.textContent!.trim())).toEqual(['Germany']);
      await userEvent.keyboard('{Enter}');
      await settle();
      expect(
        outputs(
          demoAfter(element, 'filter').nextElementSibling!.nextElementSibling!.nextElementSibling!,
        ),
      ).toEqual(['DE']);
    });

    it('disables the select and the one in the fieldset', async () => {
      const element = await render();
      const demo = demoAfter(element, 'disabled');
      for (const trigger of Array.from(
        demo.querySelectorAll<HTMLButtonElement>('.ck-select__trigger'),
      )) {
        expect(trigger.matches(':disabled')).toBe(true);
        await open(trigger);
        expect(document.querySelector('.ck-select-popup')).toBeNull();
      }
    });

    it('recognises an object value by id with compareWith', async () => {
      const element = await render();
      const demo = demoAfter(element, 'objects');
      const trigger = demo.querySelector<HTMLButtonElement>('.ck-select__trigger')!;
      expect(trigger.textContent).toContain('Endurance');
      await open(trigger);
      expect(options().map((option) => option.getAttribute('aria-selected'))).toEqual([
        'false',
        'true',
        'false',
      ]);
      options()[2].click();
      await settle();
      expect(outputs(demo)).toEqual(['Tempo']);
    });

    it('keeps the three form demos in sync with their forms and shows each error after the touch', async () => {
      const element = await render();
      const demo = demoAfter(element, 'reactive-forms');
      const trigger = triggerNamed(element, 'Target, Reactive Forms');
      const error = demo.querySelector<HTMLElement>('ck-error')!;
      expect(outputs(demo)).toEqual(['none', 'no', 'no']);
      expect(error.hidden).toBe(true);
      trigger.focus();
      await open(trigger);
      options()[0].click();
      await settle();
      expect(outputs(demo)).toEqual(['ftp', 'yes', 'no']);
      await userEvent.click(demo.querySelectorAll('.actions button')[1]);
      await settle();
      expect(outputs(demo)[0]).toBe('none');
      await userEvent.click(demo.querySelectorAll('.actions button')[2]);
      await settle();
      expect(error.hidden).toBe(false);
      expect(trigger.getAttribute('aria-invalid')).toBe('true');
      await userEvent.click(demo.querySelectorAll('.actions button')[0]);
      await settle();
      expect(trigger.textContent).toContain('Level');
      await userEvent.click(demo.querySelectorAll('.actions button')[3]);
      await settle();
      expect(trigger.disabled).toBe(true);

      const model = triggerNamed(element, 'Target, ngModel');
      model.focus();
      key(model, 'ArrowDown');
      key(model, 'Enter');
      await settle();
      expect(demoAfter(element, 'ng-model').querySelector('output')!.textContent).toBe('ftp');

      const signal = triggerNamed(element, 'Target, Signal Forms');
      signal.focus();
      key(signal, 'End');
      key(signal, 'Enter');
      await settle();
      expect(outputs(demoAfter(element, 'signal-forms'))).toEqual(['level', 'no']);
    });

    it('shows the four sizes at their control heights', async () => {
      const element = await render();
      const heights = ['Small', 'Medium', 'Large', 'Extra large'].map(
        (name) => triggerNamed(element, name).getBoundingClientRect().height,
      );
      expect(heights).toEqual([32, 40, 48, 60]);
    });
  });

  describe('global resets', () => {
    function applyReset(css: string): void {
      const style = document.createElement('style');
      style.dataset['testReset'] = '';
      style.textContent = css;
      document.head.appendChild(style);
    }

    it('shows a reset that really removes the border of the button and the padding of the rows', async () => {
      const element = await render();
      const trigger = standaloneTrigger(element);
      await open(trigger);
      const row = options()[0];
      expect(getComputedStyle(trigger).borderTopWidth).not.toBe('0px');
      expect(getComputedStyle(row).paddingLeft).not.toBe('0px');
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(trigger).borderTopWidth).toBe('0px');
      expect(getComputedStyle(row).paddingLeft).toBe('0px');
    });

    it('shows a scoped reset that leaves the select alone but still hits other buttons', async () => {
      const element = await render();
      const trigger = standaloneTrigger(element);
      await open(trigger);
      const row = options()[0];
      const other = element.querySelector<HTMLElement>('.actions button')!;
      expect(getComputedStyle(other).borderTopWidth).not.toBe('0px');
      const padding = getComputedStyle(row).paddingLeft;
      applyReset(RESET_SCOPED.split('/* Or declare')[0]);
      expect(getComputedStyle(trigger).borderTopWidth).not.toBe('0px');
      expect(getComputedStyle(row).paddingLeft).toBe(padding);
      expect(getComputedStyle(other).borderTopWidth).toBe('0px');
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
          if (item.tagName === 'KBD') {
            continue;
          }
          expect(item.getClientRects().length, header.textContent!).toBe(1);
        }
      }
    });

    it('does not overflow the page at 390px, and every select fits it', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const select of Array.from(element.querySelectorAll<HTMLElement>('ck-select'))) {
        expect(select.getBoundingClientRect().right).toBeLessThanOrEqual(390);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, closed and with a list open', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      const trigger = standaloneTrigger(element);
      trigger.focus();
      key(trigger, 'ArrowDown');
      key(trigger, 'ArrowDown');
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });
  });
});
