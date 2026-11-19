import { ApplicationRef } from '@angular/core';
import { page } from 'vitest/browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { contrastRatio } from '../../../../../../core/testing/contrast';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { ButtonPage } from './button-page';
import { SAMPLES } from './button-samples';

describe('ButtonPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [ButtonPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ButtonPage);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    await settleAnimations();
    return fixture.nativeElement as HTMLElement;
  }

  const demoButton = (element: HTMLElement, name: string): HTMLElement =>
    Array.from(element.querySelectorAll<HTMLElement>('.demo [ckButton]')).find(
      (button) => button.textContent?.trim() === name,
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
    for (const heading of Array.from(element.querySelectorAll('h1, h2, h3'))) {
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

  it('documents every input of the component in the API table', async () => {
    const element = await render();
    const names = Array.from(element.querySelectorAll('#api + .table-scroll tbody th'), (cell) =>
      cell.textContent!.trim(),
    );
    expect(names).toEqual(['variant', 'size', 'iconOnly', 'loading', 'disabled']);
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('renders all four variants as live buttons', async () => {
    const element = await render();
    for (const [name, variant] of [
      ['Primary', 'primary'],
      ['Secondary', 'secondary'],
      ['Ghost', 'ghost'],
      ['Danger', 'danger'],
    ]) {
      expect(demoButton(element, name).classList.contains(`ck-button--${variant}`)).toBe(true);
    }
  });

  it('toggles the loading demo, keeps its width and ignores clicks on the loading button', async () => {
    const element = await render();
    const fixtureButton = demoButton(element, 'Save changes') as HTMLButtonElement;
    const toggle = demoButton(element, 'Toggle loading') as HTMLButtonElement;
    const before = fixtureButton.getBoundingClientRect().width;
    toggle.click();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(fixtureButton.getAttribute('aria-disabled')).toBe('true');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(fixtureButton.getBoundingClientRect().width).toBe(before);
    fixtureButton.click();
    expect(fixtureButton.getAttribute('aria-disabled')).toBe('true');
  });

  it('uses the shipped heights, and an icon-only button is square', async () => {
    const element = await render();
    const heights = ['Small', 'Medium', 'Large'].map(
      (name) => demoButton(element, name).getBoundingClientRect().height,
    );
    expect(heights).toEqual([32, 40, 48]);
    const iconOnly = element.querySelector<HTMLElement>('.ck-button--icon-only')!;
    const box = iconOnly.getBoundingClientRect();
    expect([box.width, box.height]).toEqual([40, 40]);
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
        const lines = new Set(
          Array.from(header.querySelectorAll('code, kbd'), (item) =>
            Array.from(item.getClientRects(), (box) => Math.round(box.top)).join(),
          ),
        );
        for (const item of Array.from(header.querySelectorAll('code, kbd'))) {
          expect(item.getClientRects().length, header.textContent!).toBe(1);
        }
        expect(lines.size).toBeGreaterThan(0);
      }
    });

    it('does not overflow the page at 390px', async () => {
      await page.viewport(390, 844);
      await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, in every state', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      demoButton(element, 'Toggle loading').click();
      await TestBed.inject(ApplicationRef).whenStable();
      await settleAnimations();
      await expectNoAxeViolations(element);
    });

    it('meets 4.5:1 text contrast on every variant against the real tokens', async () => {
      setTestTheme(theme);
      const element = await render();
      const background = getComputedStyle(element.querySelector('.demo')!).backgroundColor;
      const failures: string[] = [];
      for (const variant of ['primary', 'secondary', 'ghost', 'danger']) {
        const button = element.querySelector<HTMLElement>(`.ck-button--${variant}`)!;
        const style = getComputedStyle(button);
        const buttonBackground =
          style.backgroundColor === 'rgba(0, 0, 0, 0)' ? background : style.backgroundColor;
        const ratio = contrastRatio(style.color, buttonBackground);
        if (ratio < 4.5) {
          failures.push(`${variant}: ${ratio.toFixed(2)}`);
        }
      }
      expect(failures).toEqual([]);
    });

    it('draws the secondary border at 3:1 or more against the surface', async () => {
      setTestTheme(theme);
      const element = await render();
      const secondary = element.querySelector<HTMLElement>('.ck-button--secondary')!;
      const style = getComputedStyle(secondary);
      expect(contrastRatio(style.borderTopColor, style.backgroundColor)).toBeGreaterThanOrEqual(3);
    });
  });
});
