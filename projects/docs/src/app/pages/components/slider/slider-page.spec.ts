import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkSlider } from '@ckui/core/slider';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { SliderPage } from './slider-page';
import { RESET_BREAKS, RESET_SCOPED, SAMPLES } from './slider-samples';

describe('SliderPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [SliderPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(SliderPage);
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

  const sliderNamed = (element: HTMLElement, name: string): HTMLElement =>
    element
      .querySelector<HTMLElement>(`[role="slider"][aria-label="${name}"]`)!
      .closest<HTMLElement>('ck-slider')!;
  const thumbIn = (slider: HTMLElement): HTMLElement =>
    slider.querySelector<HTMLElement>('.ck-slider__thumb')!;
  const demoAfter = (element: HTMLElement, id: string): HTMLElement =>
    element.querySelector<HTMLElement>(`#${id} ~ .demo`)!;
  const key = (target: Element, name: string, type: 'keydown' | 'keyup' = 'keydown'): void => {
    target.dispatchEvent(new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true }));
  };
  const outputs = (demo: Element): string[] =>
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
      'commit',
      'reactive',
      'template',
      'signal',
      'sizes',
      'unit',
      'text',
      'outside',
      'states',
      'row',
    ]);
    const needs: [string, string, RegExp?][] = [
      ['Component', '@angular/core'],
      ['signal', '@angular/core'],
      ['CkSlider', '@ckui/core/slider'],
      ['FormControl', '@angular/forms'],
      ['ReactiveFormsModule', '@angular/forms'],
      ['FormsModule', '@angular/forms'],
      ['FormField', '@angular/forms/signals'],
      ['form', '@angular/forms/signals', /\bform\(/],
      ['min', '@angular/forms/signals', /\bmin\(/],
      ['max', '@angular/forms/signals', /\bmax\(/],
    ];
    for (const [name, sample] of typescript) {
      const importLines = sample.split('\n').filter((line) => line.startsWith('import '));
      const body = sample
        .split('\n')
        .filter((line) => !line.startsWith('import '))
        .join('\n');
      for (const [identifier, module, usage] of needs) {
        // `form`, `min` and `max` are also attribute names and words, so they count as used when called.
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
      expect(sample, name).toMatch(/imports: \[[^\]]*CkSlider[^\]]*\]/);
      expect(sample, name).toMatch(/aria-label(ledby)?=/);
      // Every name a template binds is declared, so the sample compiles as copied.
      for (const [, used] of Array.from(
        body.matchAll(
          /\[\(?(?:value|ngModel|valueText|formControl)\)?\]="(?!null")([A-Za-z_]\w*)(?:\(\))?"|\(valueCommit\)="([A-Za-z_]\w*)\(/g,
        ),
        (match) => [match[0], match[1] ?? match[2]] as const,
      )) {
        expect(body, `${name} declares ${used}`).toMatch(
          new RegExp(`(readonly |protected |private )+${used}\\b|\\b${used} =`),
        );
      }
    }
    // State that changes after a callback is a signal, so the samples work in a zoneless app.
    for (const name of ['basics', 'commit', 'unit', 'text', 'row'] as const) {
      expect(SAMPLES[name], name).toContain("import { Component, signal } from '@angular/core'");
      expect(SAMPLES[name], name).toMatch(/\[\(value\)\]="\w+"/);
    }
    expect(SAMPLES.commit).toContain('(valueCommit)="send($event)"');
    expect(SAMPLES.commit).toContain('this.sent.update');
    expect(SAMPLES.reactive).toContain('[formControl]="grade"');
    expect(SAMPLES.template).toContain('[(ngModel)]="grade"');
    expect(SAMPLES.signal).toContain('[formField]="settings.grade"');
    expect(SAMPLES.text).toContain('[valueText]="describe"');
    expect(SAMPLES.unit).toContain('unit="%"');
    expect(SAMPLES.sizes).toContain('size="xl"');
    expect(SAMPLES.row).toContain('aria-labelledby="grade-label"');
    expect(SAMPLES.tokens).toContain('--ck-slider-thumb-border');
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

  it('documents every input of the slider', async () => {
    const element = await render();
    const documented = Array.from(
      element.querySelectorAll('#api + .table-scroll tbody tr'),
      (row) => row.querySelector('th')!.textContent!.trim(),
    ).sort();
    const declared = reflectComponentType(CkSlider)!
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

  it('names every slider on the page', async () => {
    const element = await render();
    const thumbs = Array.from(element.querySelectorAll<HTMLElement>('[role="slider"]'));
    expect(thumbs.length).toBeGreaterThanOrEqual(14);
    for (const thumb of thumbs) {
      const labelledby = thumb.getAttribute('aria-labelledby');
      const name =
        thumb.getAttribute('aria-label') ?? element.querySelector(`#${labelledby}`)?.textContent;
      expect(name?.trim(), thumb.outerHTML).toBeTruthy();
    }
  });

  describe('the examples', () => {
    it('moves the level with the keys and stops at the limits', async () => {
      const element = await render();
      const demo = demoAfter(element, 'basics');
      const thumb = thumbIn(sliderNamed(element, 'Resistance level'));
      expect(thumb.getAttribute('aria-valuenow')).toBe('8');
      key(thumb, 'ArrowRight');
      await settle();
      expect(outputs(demo)).toEqual(['9']);
      key(thumb, 'End');
      await settle();
      expect(outputs(demo)).toEqual(['24']);
      key(thumb, 'ArrowRight');
      await settle();
      expect(outputs(demo)).toEqual(['24']);
      key(thumb, 'Home');
      await settle();
      expect(outputs(demo)).toEqual(['1']);
      expect(demo.querySelector('.ck-slider__value-text')!.textContent).toBe('1');
    });

    it('shows the live value at once and the committed one only when the change ends', async () => {
      const element = await render();
      const demo = demoAfter(element, 'commit');
      const thumb = thumbIn(sliderNamed(element, 'Target power'));
      expect(outputs(demo)).toEqual(['150', 'none yet']);
      key(thumb, 'ArrowRight');
      key(thumb, 'ArrowRight');
      key(thumb, 'ArrowRight');
      await settle();
      expect(outputs(demo)).toEqual(['165', 'none yet']);
      key(thumb, 'ArrowRight', 'keyup');
      await settle();
      expect(outputs(demo)).toEqual(['165', '165']);
      key(thumb, 'PageUp');
      key(thumb, 'PageUp', 'keyup');
      await settle();
      expect(outputs(demo)).toEqual(['215', '165, 215']);
      await userEvent.click(demo.querySelector('.actions button')!);
      await settle();
      expect(outputs(demo)).toEqual(['215', 'none yet']);
    });

    it('commits a click on the track once, with a real mouse', async () => {
      const element = await render();
      const demo = demoAfter(element, 'commit');
      const rail = demo.querySelector<HTMLElement>('.ck-slider__rail')!;
      const box = rail.getBoundingClientRect();
      await userEvent.click(rail, { position: { x: box.width * 0.8, y: box.height / 2 } });
      await settle();
      const [live, committed] = outputs(demo);
      expect(Number(live)).toBeGreaterThan(350);
      expect(committed).toBe(live);
    });

    it('shows the grade with a decimal step and the unit in the value text', async () => {
      const element = await render();
      const slider = sliderNamed(element, 'Grade');
      const thumb = thumbIn(slider);
      expect(thumb.getAttribute('aria-valuetext')).toBe('4.5%');
      key(thumb, 'ArrowRight');
      await settle();
      expect(thumb.getAttribute('aria-valuetext')).toBe('5.0%');
      expect(slider.querySelector('.ck-slider__value-text')!.textContent).toBe('5.0%');
      expect(demoAfter(element, 'unit').querySelector('output')!.textContent).toBe('5');
    });

    it('writes the value text through valueText for the thumb and the shown value', async () => {
      const element = await render();
      const slider = sliderNamed(element, 'Resistance');
      expect(thumbIn(slider).getAttribute('aria-valuetext')).toBe('Level 8 of 24');
      expect(slider.querySelector('.ck-slider__value-text')!.textContent).toBe('Level 8 of 24');
    });

    it('keeps the three form demos in sync with their forms', async () => {
      const element = await render();
      const reactive = thumbIn(sliderNamed(element, 'Grade, Reactive Forms'));
      const demo = demoAfter(element, 'reactive-forms');
      expect(outputs(demo)).toEqual(['2', 'no', 'no']);
      key(reactive, 'ArrowRight');
      await settle();
      expect(outputs(demo)).toEqual(['3', 'yes', 'no']);
      await userEvent.click(demo.querySelectorAll('.actions button')[0]);
      await settle();
      expect(reactive.getAttribute('aria-valuenow')).toBe('12');
      await userEvent.click(demo.querySelectorAll('.actions button')[1]);
      await settle();
      expect(reactive.getAttribute('aria-valuenow')).toBe('-10');
      expect(outputs(demo)[0]).toBe('none');
      await userEvent.click(demo.querySelectorAll('.actions button')[2]);
      await settle();
      expect(reactive.getAttribute('aria-disabled')).toBe('true');

      const model = thumbIn(sliderNamed(element, 'Grade, ngModel'));
      key(model, 'ArrowRight');
      await settle();
      expect(demoAfter(element, 'ng-model').querySelector('output')!.textContent).toBe('3');

      const signal = thumbIn(sliderNamed(element, 'Grade, Signal Forms'));
      key(signal, 'ArrowLeft');
      await settle();
      expect(demoAfter(element, 'signal-forms').querySelector('output')!.textContent).toBe('1');
    });

    it('shows the four sizes at their control heights', async () => {
      const element = await render();
      const heights = ['Small', 'Medium', 'Large', 'Extra large'].map(
        (name) => sliderNamed(element, name).getBoundingClientRect().height,
      );
      expect(heights).toEqual([32, 40, 48, 60]);
    });

    it('shows a value outside the range clamped, one off the step snapped and none at the minimum', async () => {
      const element = await render();
      const demo = demoAfter(element, 'outside');
      const [clamped, snapped, none] = [
        'Cadence, shown at the limit',
        'Grade, shown on the step',
        'Grade, not set',
      ].map((name) => sliderNamed(element, name));
      expect(thumbIn(clamped).getAttribute('aria-valuenow')).toBe('100');
      expect(thumbIn(snapped).getAttribute('aria-valuenow')).toBe('33.5');
      expect(thumbIn(none).getAttribute('aria-valuenow')).toBe('-10');
      expect(none.querySelector<HTMLElement>('.ck-slider__fill')!.style.inlineSize).toBe('0%');
      expect(demo.querySelectorAll('ck-slider')).toHaveLength(3);
    });

    it('locks the disabled sliders, also the one in a fieldset', async () => {
      const element = await render();
      const disabled = thumbIn(sliderNamed(element, 'Disabled'));
      expect(disabled.getAttribute('aria-disabled')).toBe('true');
      expect(disabled.hasAttribute('tabindex')).toBe(false);
      const locked = thumbIn(sliderNamed(element, 'In a disabled fieldset'));
      expect(locked.getAttribute('aria-disabled')).toBe('true');
      key(locked, 'End');
      await settle();
      expect(locked.getAttribute('aria-valuenow')).toBe('40');
    });

    it('recreates the settings row: a label names the thumb, steps of 0.5, limits -10 to 20', async () => {
      const element = await render();
      const row = element.querySelector<HTMLElement>('.row')!;
      const thumb = thumbIn(row.querySelector<HTMLElement>('ck-slider')!);
      expect(thumb.getAttribute('aria-labelledby')).toBe('grade-label');
      expect(thumb.getAttribute('aria-valuenow')).toBe('2');
      key(thumb, 'ArrowRight');
      await settle();
      expect(thumb.getAttribute('aria-valuenow')).toBe('2.5');
      expect(thumb.getAttribute('aria-valuetext')).toBe('2.5%');
      expect(thumb.getAttribute('aria-valuemin')).toBe('-10');
      expect(thumb.getAttribute('aria-valuemax')).toBe('20');
    });
  });

  describe('global resets', () => {
    function applyReset(css: string): void {
      const style = document.createElement('style');
      style.dataset['testReset'] = '';
      style.textContent = css;
      document.head.appendChild(style);
    }

    it('shows a reset that really removes the border of the rail and the ring of the thumb', async () => {
      const element = await render();
      const slider = sliderNamed(element, 'Resistance level');
      const rail = slider.querySelector<HTMLElement>('.ck-slider__rail')!;
      expect(getComputedStyle(rail).borderTopWidth).toBe('1px');
      expect(getComputedStyle(thumbIn(slider)).borderTopWidth).toBe('2px');
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(rail).borderTopWidth).toBe('0px');
      expect(getComputedStyle(thumbIn(slider)).borderTopWidth).toBe('0px');
    });

    it('shows a scoped reset that leaves the slider alone but still hits other elements', async () => {
      const element = await render();
      const slider = sliderNamed(element, 'Resistance level');
      const rail = slider.querySelector<HTMLElement>('.ck-slider__rail')!;
      const other = element.querySelector<HTMLElement>('.actions button')!;
      expect(getComputedStyle(other).borderTopWidth).toBe('1px');
      applyReset(RESET_SCOPED.split('/* Or declare')[0]);
      expect(getComputedStyle(rail).borderTopWidth).toBe('1px');
      expect(getComputedStyle(thumbIn(slider)).borderTopWidth).toBe('2px');
      expect(getComputedStyle(other).borderTopWidth).toBe('0px');
    });

    it('keeps the thumb in place under the margin and padding part of the reset', async () => {
      const element = await render();
      const slider = sliderNamed(element, 'Resistance level');
      const before = thumbIn(slider).getBoundingClientRect();
      applyReset('*, *::before, *::after { margin: 0; padding: 0; }');
      const after = thumbIn(slider).getBoundingClientRect();
      expect(Math.abs(after.left - before.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(1);
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

    it('does not overflow the page at 390px, and every slider fits it', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const slider of Array.from(element.querySelectorAll<HTMLElement>('ck-slider'))) {
        expect(slider.getBoundingClientRect().right).toBeLessThanOrEqual(390);
        expect(
          slider.querySelector('.ck-slider__track')!.getBoundingClientRect().width,
        ).toBeGreaterThan(60);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, also with the thumb moved and focused', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      const thumb = thumbIn(sliderNamed(element, 'Resistance level'));
      thumb.focus();
      key(thumb, 'End');
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
    });
  });
});
