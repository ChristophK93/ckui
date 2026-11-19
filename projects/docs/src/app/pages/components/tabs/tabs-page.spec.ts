import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkTab, CkTabPanel, CkTabs } from '@ckui/core/tabs';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { contrastRatio } from '../../../../../../core/testing/contrast';
import { compositeOver } from '../../../testing/composite';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { TabsPage } from './tabs-page';
import { SAMPLES } from './tabs-samples';

describe('TabsPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(TabsPage);
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

  const group = (element: HTMLElement, label: string): HTMLElement =>
    element.querySelector<HTMLElement>(`ck-tab-list[aria-label="${label}"]`)!.closest('ck-tabs')!;
  const tabs = (host: HTMLElement): HTMLElement[] =>
    Array.from(host.querySelectorAll<HTMLElement>('ck-tab'));
  const selected = (host: HTMLElement): string[] =>
    tabs(host)
      .filter((tab) => tab.getAttribute('aria-selected') === 'true')
      .map((tab) => tab.textContent!.trim());
  const shown = (host: HTMLElement): string[] =>
    Array.from(host.querySelectorAll<HTMLElement>('ck-tab-panel'))
      .filter((panel) => !panel.hidden)
      .map((panel) => panel.textContent!.replace(/\s+/g, ' ').trim());
  const demoOf = (host: HTMLElement): HTMLElement => host.closest<HTMLElement>('.demo')!;

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
      'basics',
      'panels',
      'lazy',
      'manual',
      'sizes',
      'fullWidth',
      'overflow',
      'disabled',
      'dynamic',
    ]);
    const needs: [string, string][] = [
      ['Component', '@angular/core'],
      ['signal', '@angular/core'],
      ['CK_TABS_IMPORTS', '@ckui/core/tabs'],
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
      expect(sample, name).toContain('imports: [CK_TABS_IMPORTS]');
      expect(sample, name).toMatch(/export class \w+ \{/);
      // every template name a sample binds is declared in its class
      for (const [, binding] of sample.matchAll(/\[\(value\)\]="(\w+)"/g)) {
        expect(body, `${name} declares ${binding}`).toMatch(
          new RegExp(`(readonly )?${binding} = signal`),
        );
      }
      const outside = sample.slice(0, sample.indexOf('export class'));
      expect(outside, name).not.toMatch(/\binject\(/);
    }
    expect(SAMPLES.basics).toContain('[(value)]="source"');
    expect(SAMPLES.lazy).toContain('ckTabContent');
    expect(SAMPLES.manual).toContain('activation="manual"');
    expect(SAMPLES.sizes).toContain('size="xl"');
    expect(SAMPLES.fullWidth).toContain('fullWidth');
    expect(SAMPLES.dynamic).toContain('protected close(): void');
    for (const name of ['reset', 'tokens'] as const) {
      expect(SAMPLES[name], name).toContain('{');
    }
    expect(SAMPLES.tokens).toContain('--ck-tabs-indicator');
    expect(SAMPLES.reset).toContain('@layer reset, ckui;');
  });

  it('never shows the internal entry point or the icon component', async () => {
    const element = await render();
    expect(element.textContent).not.toContain('@ckui/core/internal');
    expect(element.querySelector('ck-icon')).toBeNull();
    expect(element.textContent).not.toContain('ck-icon');
    for (const sample of Object.values(SAMPLES)) {
      expect(sample).not.toContain('@ckui/core/internal');
      expect(sample).not.toContain('ck-icon');
    }
  });

  it('documents every input of the group, the tab and the panel', async () => {
    const element = await render();
    const rows = Array.from(element.querySelectorAll('#api + .table-scroll tbody tr'), (row) => [
      row.querySelector('th')!.textContent!.trim(),
      row.querySelectorAll('td')[0].textContent!.trim(),
    ]);
    const documented = (on: string) =>
      rows.filter(([, owner]) => owner === on).map(([name]) => name);
    const declared = (type: unknown) =>
      reflectComponentType(type as never)!
        .inputs.map((input) => input.templateName)
        .sort();
    expect(documented('ck-tabs').sort()).toEqual(declared(CkTabs));
    expect(documented('ck-tab').sort()).toEqual(declared(CkTab));
    expect(documented('ck-tab-panel').sort()).toEqual(declared(CkTabPanel));
  });

  it('documents every component token the stylesheet reads', async () => {
    const element = await render();
    const documented = Array.from(
      element.querySelectorAll('#tokens ~ .table-scroll tbody th code'),
      (code) => code.textContent!,
    );
    expect(documented.sort()).toEqual(
      [
        '--ck-tabs-border-color',
        '--ck-tabs-fg',
        '--ck-tabs-fg-selected',
        '--ck-tabs-font-weight',
        '--ck-tabs-font-weight-selected',
        '--ck-tabs-gap',
        '--ck-tabs-indicator',
        '--ck-tabs-indicator-thickness',
        '--ck-tabs-padding-inline',
      ].sort(),
    );
    expect(documented).toContain('--ck-tabs-indicator');
    expect(documented).toContain('--ck-tabs-gap');
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('names every tab list on the page', async () => {
    const element = await render();
    const lists = Array.from(element.querySelectorAll('ck-tab-list'));
    expect(lists.length).toBeGreaterThan(8);
    for (const list of lists) {
      expect(list.getAttribute('aria-label')?.trim(), list.outerHTML).toBeTruthy();
    }
  });

  describe('the examples', () => {
    it('shows the shared panel for the first tab, follows a click and writes the model only then', async () => {
      const element = await render();
      const host = group(element, 'Workout source');
      expect(selected(host)).toEqual(['Predefined']);
      expect(shown(host)).toEqual(['One list for the predefined workouts.']);
      expect(demoOf(host).querySelector('.status output')!.textContent).toBe('null');
      await userEvent.click(tabs(host)[2]);
      await settle();
      expect(selected(host)).toEqual(['Shared']);
      expect(shown(host)).toEqual(['One list for the shared workouts.']);
      expect(demoOf(host).querySelector('.status output')!.textContent).toBe('shared');
      await userEvent.keyboard('{ArrowRight}');
      await settle();
      expect(selected(host)).toEqual(['Predefined']);
      expect(demoOf(host).querySelector('.status output')!.textContent).toBe('predefined');
    });

    it('starts on the tab named by value and shows only its panel', async () => {
      const element = await render();
      const host = group(element, 'Settings');
      expect(selected(host)).toEqual(['Audio']);
      expect(shown(host)).toEqual(['Volume and cues.']);
      await userEvent.click(tabs(host)[1]);
      await settle();
      expect(shown(host)).toEqual(['Resolution and frame rate.']);
    });

    it('keeps the eager panel content and rebuilds the lazy one', async () => {
      const element = await render();
      const host = group(element, 'Ride');
      const eager = host.querySelector<HTMLInputElement>('ck-tab-panel input')!;
      eager.value = 'kept';
      expect(host.querySelectorAll('ck-tab-panel')).toHaveLength(2);
      expect(host.querySelector('ck-tab-panel:not([hidden]) input')).toBe(eager);
      expect(host.querySelectorAll('input')).toHaveLength(1);
      await userEvent.click(tabs(host)[1]);
      await settle();
      const lazy = host
        .querySelectorAll<HTMLInputElement>('ck-tab-panel')[1]
        .querySelector('input')!;
      lazy.value = 'lost';
      await userEvent.click(tabs(host)[0]);
      await settle();
      expect(host.querySelectorAll('ck-tab-panel')[1].querySelector('input')).toBeNull();
      expect(eager.value).toBe('kept');
      await userEvent.click(tabs(host)[1]);
      await settle();
      expect(host.querySelectorAll('ck-tab-panel')[1].querySelector('input')!.value).toBe('');
    });

    it('moves focus without selecting in the manual example, and selects on Enter', async () => {
      const element = await render();
      const host = group(element, 'Calendar view');
      tabs(host)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      await settle();
      expect(document.activeElement).toBe(tabs(host)[1]);
      expect(selected(host)).toEqual(['Day']);
      expect(shown(host)).toEqual(['Showing: day']);
      await userEvent.keyboard('{Enter}');
      await settle();
      expect(selected(host)).toEqual(['Week']);
      expect(shown(host)).toEqual(['Showing: week']);
    });

    it('draws the four sizes at the control heights', async () => {
      const element = await render();
      const expected = { Small: 32, Medium: 40, Large: 48, 'Extra large': 60 } as const;
      for (const [label, height] of Object.entries(expected)) {
        for (const tab of tabs(group(element, label))) {
          expect(tab.getBoundingClientRect().height, label).toBe(height);
        }
      }
    });

    it('lines the row up with a button of the same size', async () => {
      const element = await render();
      const button = element.querySelector<HTMLElement>('.actions button')!;
      expect(button.getBoundingClientRect().height).toBe(
        tabs(group(element, 'Small'))[0].getBoundingClientRect().height,
      );
    });

    it('shares the phone width equally in the full width example, in full', async () => {
      const element = await render();
      const host = group(element, 'Workout source, phone width');
      const labels = Array.from(host.querySelectorAll<HTMLElement>('.ck-tab__label'));
      expect(labels.map((label) => label.textContent)).toEqual([
        'Vordefiniert',
        'Meine',
        'Geteilt',
      ]);
      expect(labels.filter((label) => label.scrollWidth > label.clientWidth)).toEqual([]);
      const row = host.querySelector('ck-tab-list')!;
      expect(row.getBoundingClientRect().width).toBeLessThanOrEqual(328);
      const widths = tabs(host).map((tab) => tab.getBoundingClientRect().width);
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(
        row.getBoundingClientRect().width / 3,
      );
    });

    it('scrolls the overflowing row inside the demo and shows the selected week', async () => {
      const element = await render();
      const host = group(element, 'Training weeks');
      const row = host.querySelector<HTMLElement>('ck-tab-list')!;
      expect(row.getBoundingClientRect().width).toBeLessThanOrEqual(328);
      expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
      const week = tabs(host)[10].getBoundingClientRect();
      expect(selected(host)).toEqual(['Week 11']);
      expect(week.left).toBeGreaterThanOrEqual(row.getBoundingClientRect().left - 0.5);
      expect(week.right).toBeLessThanOrEqual(row.getBoundingClientRect().right + 0.5);
      await userEvent.click(tabs(host)[0]);
      await settle();
      expect(row.scrollLeft).toBe(0);
    });

    it('skips the disabled tab with the arrow keys', async () => {
      const element = await render();
      const host = group(element, 'Plan');
      tabs(host)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      await settle();
      expect(selected(host)).toEqual(['Company']);
      expect(document.activeElement).toBe(tabs(host)[2]);
      expect(tabs(host)[1].getAttribute('aria-disabled')).toBe('true');
    });

    it('shows the first ride when the selected one is closed, and restores the tabs', async () => {
      const element = await render();
      const host = group(element, 'Open rides');
      const [close, restore] = Array.from(
        demoOf(host).querySelectorAll<HTMLButtonElement>('.actions button'),
      );
      await userEvent.click(tabs(host)[1]);
      await settle();
      expect(shown(host)).toEqual(['Details of Tuesday.']);
      await userEvent.click(close);
      await settle();
      expect(tabs(host).map((tab) => tab.textContent!.trim())).toEqual(['Sunday', 'Thursday']);
      expect(selected(host)).toEqual(['Sunday']);
      expect(shown(host)).toEqual(['Details of Sunday.']);
      await userEvent.click(close);
      await userEvent.click(close);
      await settle();
      expect(tabs(host)).toHaveLength(0);
      expect(shown(host)).toEqual([]);
      await userEvent.click(restore);
      await settle();
      expect(tabs(host)).toHaveLength(3);
      expect(selected(host)).toEqual(['Sunday']);
    });
  });

  describe('global styles', () => {
    afterEach(() => {
      document.head.querySelectorAll('style[data-test]').forEach((style) => style.remove());
    });

    const addStyle = (css: string): void => {
      const style = document.createElement('style');
      style.dataset['test'] = 'true';
      style.textContent = css;
      document.head.appendChild(style);
    };

    it('draws the ring inside the focused tab, and no second one from the site rule', async () => {
      const element = await render();
      const host = group(element, 'Workout source');
      element.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
      element.querySelector<HTMLElement>('#before')!.focus();
      for (let step = 0; step < 6 && document.activeElement !== tabs(host)[0]; step++) {
        await userEvent.tab();
      }
      expect(document.activeElement).toBe(tabs(host)[0]);
      const ring = getComputedStyle(tabs(host)[0], '::before');
      expect(ring.outlineStyle).toBe('solid');
      expect(ring.outlineOffset).toBe(`-${ring.outlineWidth}`);
      expect(getComputedStyle(tabs(host)[0]).outlineStyle).toBe('none');
    });

    it('shows that an unlayered display rule keeps hidden panels on screen, and that the documented fix hides them', async () => {
      const element = await render();
      const host = group(element, 'Settings');
      const hidden = host.querySelectorAll<HTMLElement>('ck-tab-panel')[1];
      expect(hidden.hidden).toBe(true);
      expect(getComputedStyle(hidden).display).toBe('none');
      addStyle('ck-tab-panel { display: grid; }');
      expect(getComputedStyle(hidden).display).toBe('grid');
      document.head.querySelectorAll('style[data-test]').forEach((style) => style.remove());
      addStyle('ck-tab-panel:not([hidden]) { display: grid; }');
      expect(getComputedStyle(hidden).display).toBe('none');
      expect(getComputedStyle(host.querySelector<HTMLElement>('ck-tab-panel')!).display).toBe(
        'grid',
      );
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

    it('does not overflow the page at 390px, and no tab row is wider than the viewport', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const row of Array.from(element.querySelectorAll<HTMLElement>('ck-tab-list'))) {
        expect(row.getBoundingClientRect().right, row.ariaLabel!).toBeLessThanOrEqual(390);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, idle and after moving through the tabs', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      tabs(group(element, 'Workout source'))[0].focus();
      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      await userEvent.click(tabs(group(element, 'Ride'))[1]);
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
    });

    it('meets text contrast for selected, unselected, hovered and active tabs', async () => {
      setTestTheme(theme);
      const element = await render();
      const host = group(element, 'Workout source');
      const surface = getComputedStyle(demoOf(host)).backgroundColor;
      const [unselected, , other] = tabs(host);
      await userEvent.click(other);
      await settle();
      await settleAnimations();
      expect(contrastRatio(getComputedStyle(other).color, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(getComputedStyle(unselected).color, surface)).toBeGreaterThanOrEqual(
        4.5,
      );
      for (const overlayName of ['--ck-color-surface-hover', '--ck-color-surface-active']) {
        const overlay = getComputedStyle(unselected).getPropertyValue(overlayName);
        const composited = compositeOver(overlay.trim(), surface);
        expect(
          contrastRatio(getComputedStyle(unselected).color, composited),
        ).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('marks the selected tab without colour: an underline at 3:1 against the page, a heavier weight', async () => {
      setTestTheme(theme);
      const element = await render();
      const host = group(element, 'Workout source');
      const surface = getComputedStyle(demoOf(host)).backgroundColor;
      const [first, second] = tabs(host);
      const underline = getComputedStyle(first, '::after');
      expect(parseFloat(underline.blockSize)).toBe(4);
      expect(underline.scale).toBe('1');
      expect(getComputedStyle(second, '::after').scale).not.toBe('1');
      expect(contrastRatio(underline.backgroundColor, surface)).toBeGreaterThanOrEqual(3);
      expect(Number(getComputedStyle(first).fontWeight)).toBeGreaterThan(
        Number(getComputedStyle(second).fontWeight),
      );
    });

    it('draws the 1px line under the row in the subtle border colour', async () => {
      setTestTheme(theme);
      const element = await render();
      const row = getComputedStyle(group(element, 'Workout source').querySelector('ck-tab-list')!);
      expect(row.borderBottomWidth).toBe('1px');
      expect(row.borderBottomColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    it('draws a disabled tab dimmer than an enabled one', async () => {
      setTestTheme(theme);
      const element = await render();
      const [, disabled] = tabs(group(element, 'Plan'));
      const other = tabs(group(element, 'Plan'))[2];
      const surface = getComputedStyle(demoOf(disabled)).backgroundColor;
      expect(contrastRatio(getComputedStyle(disabled).color, surface)).toBeLessThan(
        contrastRatio(getComputedStyle(other).color, surface),
      );
    });
  });
});
