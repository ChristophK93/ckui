import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkBadge } from '@ckui/core/badge';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { contrastRatio } from '../../../../../../core/testing/contrast';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { BadgePage } from './badge-page';
import { SAMPLES } from './badge-samples';

describe('BadgePage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [BadgePage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(BadgePage);
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

  const badgeNamed = (element: HTMLElement, text: string): HTMLElement =>
    Array.from(element.querySelectorAll<HTMLElement>('ck-badge')).find(
      (badge) => badge.textContent!.trim() === text,
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
      'tones',
      'dot',
      'dotColor',
      'icon',
      'sizes',
      'truncation',
      'announce',
    ]);
    const needs: [string, string][] = [
      ['Component', '@angular/core'],
      ['signal', '@angular/core'],
      ['CK_BADGE_IMPORTS', '@ckui/core/badge'],
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
      expect(sample, name).toContain('CK_BADGE_IMPORTS');
    }
    expect(SAMPLES.announce).toContain("import { Component, signal } from '@angular/core'");
    expect(SAMPLES.announce).toContain('role="status"');
    expect(SAMPLES.icon).toContain('ckBadgeIcon');
    expect(SAMPLES.sizes).toContain('size="sm"');
  });

  it('never shows the internal entry point or the icon component', async () => {
    const element = await render();
    expect(element.textContent).not.toContain('@ckui/core/internal');
    expect(element.textContent).not.toContain('ck-icon');
    expect(element.textContent).not.toContain('CkAnnouncer');
    expect(element.querySelector('ck-icon')).toBeNull();
    for (const sample of Object.values(SAMPLES)) {
      expect(sample).not.toContain('@ckui/core/internal');
      expect(sample).not.toContain('ck-icon');
    }
  });

  it('documents every input of the badge', async () => {
    const element = await render();
    const documented = Array.from(
      element.querySelectorAll('#api + .table-scroll tbody tr'),
      (row) => row.querySelector('th')!.textContent!.trim(),
    ).sort();
    const declared = reflectComponentType(CkBadge)!
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

  it('documents the accessibility rules: never colour alone, no live region, global resets', async () => {
    const element = await render();
    const text = element.querySelector('#accessibility ~ ul')!.textContent!;
    expect(text).toContain('Never colour alone');
    expect(text).toContain('Not a live region');
    expect(text).toContain('Global element styles');
    expect(element.querySelector('#keyboard + p')!.textContent).toContain('not interactive');
  });

  it('gives every badge text, and hides every icon from assistive technology', async () => {
    const element = await render();
    const badges = Array.from(element.querySelectorAll<HTMLElement>('ck-badge'));
    expect(badges.length).toBeGreaterThan(8);
    for (const badge of badges) {
      expect(badge.querySelector('.ck-badge__text')!.textContent!.trim(), badge.outerHTML).not.toBe(
        '',
      );
    }
    for (const icon of Array.from(element.querySelectorAll('svg'))) {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    }
  });

  describe('the examples', () => {
    it('shows each of the four tones', async () => {
      const element = await render();
      const tones = Array.from(element.querySelectorAll('#tones ~ .demo ck-badge')).slice(0, 4);
      expect(
        tones.map(
          (badge) => badge.className.match(/ck-badge--(neutral|success|warning|danger)/)![1],
        ),
      ).toEqual(['neutral', 'success', 'warning', 'danger']);
    });

    it('draws the dots, the icons and the two sizes', async () => {
      const element = await render();
      expect(element.querySelectorAll('#dot ~ .demo .ck-badge__dot').length).toBeGreaterThanOrEqual(
        4,
      );
      expect(badgeNamed(element, 'Strava').querySelector('svg')).not.toBeNull();
      expect(badgeNamed(element, 'Small, 1.25rem').getBoundingClientRect().height).toBe(20);
      expect(badgeNamed(element, 'Medium, 1.5rem').getBoundingClientRect().height).toBe(24);
    });

    it('cuts the long texts inside the narrow containers', async () => {
      const element = await render();
      for (const text of [
        'Heart rate strap connected',
        'Upload to Strava failed after three tries',
      ]) {
        const badge = badgeNamed(element, text);
        const container = badge.parentElement!;
        expect(badge.getBoundingClientRect().width).toBeLessThanOrEqual(
          container.getBoundingClientRect().width,
        );
        const label = badge.querySelector<HTMLElement>('.ck-badge__text')!;
        expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
        expect(badge.getBoundingClientRect().height).toBe(24);
      }
    });

    it('toggles the connection badge and announces the change in the status element', async () => {
      const element = await render();
      const demo = element.querySelector<HTMLElement>('#announce ~ .demo')!;
      const badge = demo.querySelector<HTMLElement>('ck-badge')!;
      const status = demo.querySelector('[role="status"]')!;
      expect(badge.textContent!.trim()).toBe('Connected');
      expect(badge.hasAttribute('aria-live')).toBe(false);
      expect(status.textContent).toContain('nothing yet');
      await userEvent.click(demo.querySelector('button')!);
      await settle();
      expect(badge.textContent!.trim()).toBe('Disconnected');
      expect(badge.classList.contains('ck-badge--danger')).toBe(true);
      expect(status.textContent).toContain('Trainer disconnected');
      await userEvent.click(demo.querySelector('button')!);
      await settle();
      expect(badge.textContent!.trim()).toBe('Connected');
      expect(status.textContent).toContain('Trainer connected');
    });
  });

  describe('table layout', () => {
    afterEach(async () => {
      await page.viewport(414, 896);
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

    it('does not overflow the page at 390px, and every badge fits its container', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const badge of Array.from(element.querySelectorAll<HTMLElement>('ck-badge'))) {
        expect(badge.getBoundingClientRect().right, badge.textContent!).toBeLessThanOrEqual(390);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      await userEvent.click(element.querySelector<HTMLElement>('#announce ~ .demo button')!);
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
    });

    it('draws the green chip dot at 3:1 against the neutral fill, and keeps the status in the text', async () => {
      setTestTheme(theme);
      const element = await render();
      const badge = badgeNamed(element, 'Kuipers S3 · ERG, connected');
      const dot = getComputedStyle(badge.querySelector('.ck-badge__dot')!).backgroundColor;
      expect(dot).not.toBe(getComputedStyle(badge).color);
      expect(contrastRatio(dot, getComputedStyle(badge).backgroundColor)).toBeGreaterThanOrEqual(3);
    });

    it('keeps the text of every tone at 4.5:1 on its own fill, and draws its dot and icon in the text colour', async () => {
      setTestTheme(theme);
      const element = await render();
      for (const badge of Array.from(element.querySelectorAll<HTMLElement>('ck-badge'))) {
        const style = getComputedStyle(badge);
        expect(
          contrastRatio(style.color, style.backgroundColor),
          `${badge.textContent!.trim()} (${badge.className})`,
        ).toBeGreaterThanOrEqual(4.5);
        const dot = badge.querySelector('.ck-badge__dot');
        if (dot && !badge.style.getPropertyValue('--ck-badge-dot')) {
          expect(getComputedStyle(dot).backgroundColor).toBe(style.color);
        }
        for (const icon of Array.from(badge.querySelectorAll('svg'))) {
          expect(getComputedStyle(icon).color).toBe(style.color);
        }
      }
    });
  });
});
