import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkProgress } from '@ckui/core/progress';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { contrastRatio } from '../../../../../../core/testing/contrast';
import { compositeOver } from '../../../testing/composite';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { ProgressPage } from './progress-page';
import { SAMPLES } from './progress-samples';

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

describe('ProgressPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [ProgressPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProgressPage);
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

  const barNamed = (element: HTMLElement, name: string): HTMLElement =>
    element.querySelector<HTMLElement>(`ck-progress[aria-label="${name}"]`)!;
  const fillOf = (bar: HTMLElement): HTMLElement =>
    bar.querySelector<HTMLElement>('.ck-progress__fill')!;
  const share = (bar: HTMLElement): number =>
    fillOf(bar).getBoundingClientRect().width / bar.getBoundingClientRect().width;
  const demoAfter = (element: HTMLElement, id: string): HTMLElement =>
    element.querySelector<HTMLElement>(`#${id} ~ .demo`)!;

  afterEach(async () => {
    document.body.replaceChildren();
    resetTestTheme();
    await emulate([]);
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
      'determinate',
      'indeterminate',
      'valueText',
      'naming',
    ]);
    const needs: [string, string][] = [
      ['Component', '@angular/core'],
      ['signal', '@angular/core'],
      ['CkProgress', '@ckui/core/progress'],
    ];
    for (const [name, sample] of typescript) {
      const importLines = sample.split('\n').filter((line) => line.startsWith('import '));
      const body = sample
        .split('\n')
        .filter((line) => !line.startsWith('import '))
        .join('\n');
      for (const [identifier, module] of needs) {
        if (new RegExp(`\\b${identifier}\\b`).test(body)) {
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
      expect(sample, name).not.toContain('@ckui/core/internal');
      expect(body.trim().startsWith('@Component'), `${name} has no stray top-level code`).toBe(
        true,
      );
      expect(sample, name).toContain('imports: [CkProgress]');
      expect(sample, name).toMatch(/aria-label(ledby)?=/);
    }
    expect(SAMPLES.determinate).toContain("import { Component, signal } from '@angular/core'");
    expect(SAMPLES.valueText).toContain("import { Component, signal } from '@angular/core'");
    expect(SAMPLES.indeterminate).toContain('[value]="null"');
    expect(SAMPLES.tokens).toContain('--ck-progress-fill');
  });

  it('never shows the internal entry point or the icon component', async () => {
    const element = await render();
    expect(element.textContent).not.toContain('@ckui/core/internal');
    expect(element.textContent).not.toContain('ck-icon');
    expect(element.querySelector('ck-icon')).toBeNull();
    for (const sample of Object.values(SAMPLES)) {
      expect(sample).not.toContain('@ckui/core/internal');
    }
  });

  it('documents every input of the progress bar', async () => {
    const element = await render();
    const documented = Array.from(
      element.querySelectorAll('#api + .table-scroll tbody tr'),
      (row) => row.querySelector('th')!.textContent!.trim(),
    ).sort();
    const declared = reflectComponentType(CkProgress)!
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

  it('names every progress bar on the page', async () => {
    const element = await render();
    const bars = Array.from(element.querySelectorAll<HTMLElement>('ck-progress'));
    expect(bars.length).toBeGreaterThanOrEqual(6);
    for (const bar of bars) {
      const labelledby = bar.getAttribute('aria-labelledby');
      const name =
        bar.getAttribute('aria-label') ?? element.querySelector(`#${labelledby}`)?.textContent;
      expect(name?.trim(), bar.outerHTML).toBeTruthy();
    }
  });

  describe('the examples', () => {
    it('starts at 40 and clamps what the buttons push below 0 or above 100', async () => {
      const element = await render();
      const demo = demoAfter(element, 'determinate');
      const bar = barNamed(element, 'Upload');
      const [less, more] = Array.from(demo.querySelectorAll('button'));
      expect(bar.getAttribute('aria-valuenow')).toBe('40');
      await userEvent.click(more);
      await userEvent.click(more);
      await settle();
      await settleAnimations();
      expect(demo.querySelector('output')!.textContent).toBe('100');
      expect(bar.getAttribute('aria-valuenow')).toBe('100');
      await userEvent.click(more);
      await settle();
      await settleAnimations();
      expect(demo.querySelector('output')!.textContent).toBe('130');
      expect(bar.getAttribute('aria-valuenow')).toBe('100');
      expect(share(bar)).toBeCloseTo(1, 2);
      for (let press = 0; press < 5; press += 1) {
        await userEvent.click(less);
      }
      await settle();
      await settleAnimations();
      expect(demo.querySelector('output')!.textContent).toBe('-20');
      expect(bar.getAttribute('aria-valuenow')).toBe('0');
      expect(share(bar)).toBeCloseTo(0, 2);
    });

    it('shows the indeterminate bar without a value', async () => {
      const element = await render();
      const bar = barNamed(element, 'Connecting to the trainer');
      expect(bar.classList.contains('ck-progress--indeterminate')).toBe(true);
      expect(bar.hasAttribute('aria-valuenow')).toBe(false);
      expect(getComputedStyle(fillOf(bar)).animationName).toBe('ck-progress-slide');
    });

    it('keeps the indeterminate bar still and half full under reduced motion', async () => {
      const element = await render();
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const bar = barNamed(element, 'Connecting to the trainer');
      expect(getComputedStyle(fillOf(bar)).animationName).toBe('none');
      expect(share(bar)).toBeCloseTo(0.5, 2);
    });

    it('walks through the seven steps with value text, and stops at both ends', async () => {
      const element = await render();
      const demo = demoAfter(element, 'value-text');
      const bar = barNamed(element, 'Workout progress');
      const [previous, next] = Array.from(demo.querySelectorAll('button'));
      expect(bar.getAttribute('aria-valuetext')).toBe('Step 2 of 7');
      expect(bar.getAttribute('aria-valuemax')).toBe('7');
      await userEvent.click(next);
      await settle();
      expect(bar.getAttribute('aria-valuetext')).toBe('Step 3 of 7');
      expect(bar.getAttribute('aria-valuenow')).toBe('3');
      for (let press = 0; press < 8; press += 1) {
        await userEvent.click(next);
      }
      await settle();
      await settleAnimations();
      expect(bar.getAttribute('aria-valuetext')).toBe('Step 7 of 7');
      expect(share(bar)).toBeCloseTo(1, 2);
      for (let press = 0; press < 9; press += 1) {
        await userEvent.click(previous);
      }
      await settle();
      expect(bar.getAttribute('aria-valuetext')).toBe('Step 1 of 7');
      expect(demo.querySelector('output')!.textContent).toBe('Step 1 of 7');
    });

    it('styles the step band bar from its own tokens: 5px, dark ink on a translucent track', async () => {
      const element = await render();
      const bar = barNamed(element, 'Step progress');
      expect(bar.getBoundingClientRect().height).toBe(5);
      expect(getComputedStyle(fillOf(bar)).backgroundColor).toBe('rgb(17, 17, 17)');
      expect(getComputedStyle(bar).borderTopLeftRadius).toBe('3px');
      expect(share(bar)).toBeCloseTo(3 / 7, 2);
    });

    it('names the bars through aria-label and through aria-labelledby', async () => {
      const element = await render();
      const labelled = element.querySelector<HTMLElement>('ck-progress[aria-labelledby]')!;
      expect(
        element.querySelector(`#${labelled.getAttribute('aria-labelledby')}`)!.textContent,
      ).toBe('Syncing workouts');
      expect(barNamed(element, 'Battery').getAttribute('aria-valuenow')).toBe('80');
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
      expect(headers.length).toBeGreaterThanOrEqual(3);
      for (const header of headers) {
        for (const item of Array.from(header.querySelectorAll('code, kbd'))) {
          expect(item.getClientRects().length, header.textContent!).toBe(1);
        }
      }
    });

    it('does not overflow the page at 390px, and every bar fits its container', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const bar of Array.from(element.querySelectorAll<HTMLElement>('ck-progress'))) {
        expect(bar.getBoundingClientRect().right).toBeLessThanOrEqual(390);
        expect(bar.getBoundingClientRect().width).toBeGreaterThan(100);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, including with an out of range value', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      await userEvent.click(demoAfter(element, 'determinate').querySelectorAll('button')[1]);
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
    });

    it('draws the fill at 3:1 against the track', async () => {
      setTestTheme(theme);
      const element = await render();
      for (const label of ['Upload', 'Battery', 'Workout progress']) {
        const bar = barNamed(element, label);
        const track = getComputedStyle(bar).backgroundColor;
        const fill = getComputedStyle(fillOf(bar)).backgroundColor;
        expect(contrastRatio(fill, track), label).toBeGreaterThanOrEqual(3);
      }
    });

    it('draws the step band fill at 3:1 against its composited track', async () => {
      setTestTheme(theme);
      const element = await render();
      const bar = barNamed(element, 'Step progress');
      const band = getComputedStyle(bar.parentElement!).backgroundColor;
      const track = compositeOver(getComputedStyle(bar).backgroundColor, band);
      expect(
        contrastRatio(getComputedStyle(fillOf(bar)).backgroundColor, track),
      ).toBeGreaterThanOrEqual(3);
    });
  });
});
