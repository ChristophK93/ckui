import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkChip } from '@ckui/core/chip';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { contrastRatio } from '../../../../../../core/testing/contrast';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { ChipPage } from './chip-page';
import { SAMPLES } from './chip-samples';

describe('ChipPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [ChipPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ChipPage);
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

  const chipNamed = (element: HTMLElement, text: string): HTMLButtonElement =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button[ckChip]')).find(
      (chip) => chip.textContent!.trim() === text,
    )!;

  afterEach(() => {
    document.body.replaceChildren();
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
      'filter',
      'icon',
      'sizes',
      'wrapping',
      'disabled',
      'truncation',
      'programmatic',
    ]);
    const needs: [string, string][] = [
      ['Component', '@angular/core'],
      ['signal', '@angular/core'],
      ['CK_CHIP_IMPORTS', '@ckui/core/chip'],
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
      for (const identifier of ['endurance', 'vo2', 'threshold', 'favourites', 'clear']) {
        if (new RegExp(`\\b${identifier}\\(`).test(body) || body.includes(`"${identifier}"`)) {
          expect(body, `${name} declares ${identifier}`).toMatch(
            new RegExp(`(readonly|protected)\\s+(readonly\\s+)?${identifier}\\b`),
          );
        }
      }
      expect(sample, name).toContain('@Component');
      expect(sample, name).toMatch(/export class \w+ \{/);
      expect(sample, name).not.toContain('@ckui/core/internal');
      expect(body.trim().startsWith('@Component'), `${name} has no stray top-level code`).toBe(
        true,
      );
      expect(sample, name).toContain('CK_CHIP_IMPORTS');
      expect(sample, name).toContain('aria-label');
    }
    expect(SAMPLES.filter).toContain('[(selected)]');
    expect(SAMPLES.icon).toContain('ckChipIcon');
    expect(SAMPLES.sizes).toContain('size="xl"');
    expect(SAMPLES.disabled).toContain('<fieldset disabled>');
    expect(SAMPLES.tokens).toContain('--ck-chip-selected-bg');
    expect(SAMPLES.reset).toContain('@layer reset, ckui');
  });

  it('never shows the internal entry point or the icon component', async () => {
    const element = await render();
    expect(element.textContent).not.toContain('@ckui/core/internal');
    expect(element.textContent).not.toContain('ck-icon');
    for (const sample of Object.values(SAMPLES)) {
      expect(sample).not.toContain('@ckui/core/internal');
      expect(sample).not.toContain('ck-icon');
    }
  });

  it('documents every input of the chip', async () => {
    const element = await render();
    const documented = Array.from(
      element.querySelectorAll('#api + .table-scroll tbody tr'),
      (row) => row.querySelector('th')!.textContent!.trim(),
    ).sort();
    const declared = reflectComponentType(CkChip)!
      .inputs.map((input) => input.templateName)
      .sort();
    expect(documented).toEqual(declared);
  });

  it('documents every component token, and the library reads them all', async () => {
    const element = await render();
    const tokens = Array.from(element.querySelectorAll('#tokens ~ .table-scroll tbody th'), (row) =>
      row.textContent!.trim(),
    );
    expect(tokens).toEqual([
      '--ck-chip-bg',
      '--ck-chip-fg',
      '--ck-chip-border-color',
      '--ck-chip-selected-bg',
      '--ck-chip-selected-fg',
      '--ck-chip-radius',
      '--ck-chip-group-gap',
    ]);
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('documents the accessibility rules: toggle button, never colour alone, names, global resets', async () => {
    const element = await render();
    const text = element.querySelector('#accessibility ~ ul')!.textContent!;
    expect(text).toContain('Toggle button');
    expect(text).toContain('Never colour alone');
    expect(text).toContain('Name the chip and the group');
    expect(text).toContain('Global element styles');
  });

  it('names every group, every chip and hides every icon from assistive technology', async () => {
    const element = await render();
    const groups = Array.from(element.querySelectorAll<HTMLElement>('ck-chip-group'));
    expect(groups.length).toBeGreaterThan(5);
    for (const group of groups) {
      expect(group.getAttribute('aria-label'), group.outerHTML).toBeTruthy();
    }
    for (const chip of Array.from(element.querySelectorAll('button[ckChip]'))) {
      expect(chip.querySelector('.ck-chip__label')!.textContent!.trim()).not.toBe('');
    }
    for (const icon of Array.from(element.querySelectorAll('ck-chip-group svg'))) {
      expect(icon.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  describe('the examples', () => {
    it('toggles the filter chips and shows the result in the status element', async () => {
      const element = await render();
      const demo = element.querySelector<HTMLElement>('#filter ~ .demo')!;
      const status = demo.querySelector('[role="status"]')!;
      const vo2 = chipNamed(demo, 'VO2max');
      expect(chipNamed(demo, 'Endurance').getAttribute('aria-pressed')).toBe('true');
      expect(vo2.getAttribute('aria-pressed')).toBe('false');
      expect(status.textContent).toContain('endurance');
      await userEvent.click(vo2);
      await settle();
      expect(vo2.getAttribute('aria-pressed')).toBe('true');
      expect(vo2.querySelector('.ck-chip__check')).not.toBeNull();
      expect(status.textContent).toContain('VO2max');
      vo2.focus();
      await userEvent.keyboard(' ');
      await settle();
      expect(vo2.getAttribute('aria-pressed')).toBe('false');
      expect(status.textContent).not.toContain('VO2max');
    });

    it('swaps the icon for the check while the chip is on', async () => {
      const element = await render();
      const chip = chipNamed(element, 'Favourites');
      const icon = chip.querySelector<SVGElement>('svg.ck-chip__icon')!;
      expect(getComputedStyle(icon).display).not.toBe('none');
      await userEvent.click(chip);
      await settle();
      expect(getComputedStyle(icon).display).toBe('none');
      expect(chip.querySelector('.ck-chip__check')).not.toBeNull();
    });

    it('draws the four sizes at their control heights', async () => {
      const element = await render();
      const heights = ['Small', 'Medium', 'Large', 'Extra large'].map((label) =>
        Math.round(chipNamed(element, label).getBoundingClientRect().height),
      );
      expect(heights).toEqual([32, 40, 48, 60]);
    });

    it('wraps the narrow group onto several rows', async () => {
      const element = await render();
      const group = element.querySelector<HTMLElement>('#wrapping ~ .demo ck-chip-group')!;
      const rows = new Set(
        Array.from(group.querySelectorAll('button'), (chip) =>
          Math.round(chip.getBoundingClientRect().top),
        ),
      );
      expect(rows.size).toBeGreaterThan(1);
      for (const chip of Array.from(group.querySelectorAll('button'))) {
        expect(chip.getBoundingClientRect().right).toBeLessThanOrEqual(
          group.getBoundingClientRect().right + 0.5,
        );
      }
    });

    it('disables the chips, also through the fieldset, and keeps the check on a selected one', async () => {
      const element = await render();
      const demo = element.querySelector<HTMLElement>('#disabled ~ .demo')!;
      const [first, second] = Array.from(demo.querySelectorAll('button'));
      expect(first.disabled && second.disabled).toBe(true);
      expect(second.querySelector('.ck-chip__check')).not.toBeNull();
      const inFieldset = chipNamed(demo, 'Threshold');
      expect(inFieldset.matches(':disabled')).toBe(true);
      inFieldset.click();
      await settle();
      expect(inFieldset.getAttribute('aria-pressed')).toBe('false');
    });

    it('cuts the long text inside its container', async () => {
      const element = await render();
      const chip = chipNamed(element, 'Long endurance intervals with short recovery');
      const container = chip.closest('.narrow')!;
      expect(chip.getBoundingClientRect().width).toBeLessThanOrEqual(
        container.getBoundingClientRect().width + 0.5,
      );
      const label = chip.querySelector<HTMLElement>('.ck-chip__label')!;
      expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    });

    it('clears the chips from code without a click on them', async () => {
      const element = await render();
      const demo = element.querySelector<HTMLElement>('#programmatic ~ .demo')!;
      expect(chipNamed(demo, 'Endurance').getAttribute('aria-pressed')).toBe('true');
      await userEvent.click(demo.querySelector<HTMLElement>('button[ckButton]')!);
      await settle();
      expect(
        Array.from(demo.querySelectorAll('button[ckChip]'), (chip) =>
          chip.getAttribute('aria-pressed'),
        ),
      ).toEqual(['false', 'false', 'false']);
      expect(demo.querySelector('[role="status"]')!.textContent).toContain('1');
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
      expect(headers.length).toBeGreaterThan(5);
      for (const header of headers) {
        for (const item of Array.from(header.querySelectorAll('code, kbd'))) {
          expect(item.getClientRects().length, header.textContent!).toBe(1);
        }
      }
    });

    it('does not overflow the page at 390px, and every chip stays inside the page', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const chip of Array.from(element.querySelectorAll<HTMLElement>('button[ckChip]'))) {
        expect(chip.getBoundingClientRect().right, chip.textContent!).toBeLessThanOrEqual(390);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, also with a chip selected', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      await userEvent.click(chipNamed(element, 'VO2max'));
      await userEvent.click(chipNamed(element, 'Favourites'));
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
    });

    it('keeps a selected chip 3:1 from an unselected one and its text at 4.5:1, with the shipped tokens', async () => {
      setTestTheme(theme);
      const element = await render();
      const off = getComputedStyle(chipNamed(element, 'Threshold'));
      const on = getComputedStyle(chipNamed(element, 'Endurance'));
      expect(contrastRatio(on.backgroundColor, off.backgroundColor)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(on.color, on.backgroundColor)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(off.color, off.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    });

    it('draws the check in the selected text colour', async () => {
      setTestTheme(theme);
      const element = await render();
      const chip = chipNamed(element, 'Endurance');
      const check = chip.querySelector('.ck-chip__check')!;
      expect(getComputedStyle(check).color).toBe(getComputedStyle(chip).color);
    });
  });
});
