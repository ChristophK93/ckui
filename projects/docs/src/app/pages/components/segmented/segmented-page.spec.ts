import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkMedia } from '@ckui/core/internal';
import { CkSegment, CkSegmented } from '@ckui/core/segmented';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { contrastRatio, resolveToken } from '../../../../../../core/testing/contrast';
import { compositeOver } from '../../../testing/composite';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { SegmentedPage } from './segmented-page';
import { SAMPLES } from './segmented-samples';

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

describe('SegmentedPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [SegmentedPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(SegmentedPage);
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
    element.querySelector<HTMLElement>(`ck-segmented[aria-label="${label}"]`)!;
  const segments = (host: HTMLElement): HTMLElement[] =>
    Array.from(host.querySelectorAll<HTMLElement>('ck-segment'));
  const checked = (host: HTMLElement): string[] =>
    segments(host)
      .filter((segment) => segment.getAttribute('aria-checked') === 'true')
      .map((segment) => segment.textContent!.trim());
  const demoOf = (host: HTMLElement): HTMLElement => host.closest<HTMLElement>('.demo')!;
  const outputs = (host: HTMLElement): string[] =>
    Array.from(demoOf(host).querySelectorAll('output'), (output) => output.textContent!.trim());

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

  it('shows every sample with the import it needs, so it compiles as copied', () => {
    for (const [name, sample] of Object.entries(SAMPLES)) {
      if (name === 'reset' || name === 'tokens') {
        continue;
      }
      expect(sample, name).toContain("from '@ckui/core/segmented'");
      expect(sample, name).toContain('CK_SEGMENTED_IMPORTS');
      expect(sample, name).toContain('@Component');
    }
    expect(SAMPLES.reactive).toContain('ReactiveFormsModule');
    expect(SAMPLES.template).toContain("FormsModule } from '@angular/forms'");
    expect(SAMPLES.signal).toContain("FormField, form } from '@angular/forms/signals'");
    expect(SAMPLES.basics).toContain('signal');
    expect(SAMPLES.language).toContain("import { Component, signal } from '@angular/core'");
    expect(SAMPLES.sizes).toContain('size="xl"');
  });

  it('never shows the internal entry point or the icon component', async () => {
    const element = await render();
    expect(element.textContent).not.toContain('@ckui/core/internal');
    expect(element.querySelector('ck-icon')).toBeNull();
    expect(element.textContent).not.toContain('ck-icon');
    for (const sample of Object.values(SAMPLES)) {
      expect(sample).not.toContain('@ckui/core/internal');
    }
  });

  it('documents every input of the group and the segment', async () => {
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
    expect(documented('ck-segmented').sort()).toEqual(declared(CkSegmented));
    expect(documented('ck-segment').sort()).toEqual(declared(CkSegment));
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('names every control on the page', async () => {
    const element = await render();
    for (const control of Array.from(element.querySelectorAll('ck-segmented'))) {
      expect(control.getAttribute('aria-label')?.trim(), control.outerHTML).toBeTruthy();
    }
  });

  describe('the three forms', () => {
    it('start on Week in each of them', async () => {
      const element = await render();
      for (const label of [
        'Calendar view',
        'Calendar view, Reactive Forms',
        'Calendar view, ngModel',
        'Calendar view, Signal Forms',
      ]) {
        expect(checked(group(element, label)), label).toEqual(['Week']);
      }
    });

    it('moves the Reactive Forms control by click and key, and reports dirty and touched', async () => {
      const element = await render();
      const host = group(element, 'Calendar view, Reactive Forms');
      expect(outputs(host)).toEqual(['week', 'no', 'no']);
      await userEvent.click(segments(host)[2]);
      await settle();
      expect(checked(host)).toEqual(['Month']);
      expect(outputs(host)).toEqual(['month', 'yes', 'no']);
      await userEvent.keyboard('{ArrowRight}');
      await settle();
      expect(checked(host)).toEqual(['Day']);
      expect(outputs(host)[0]).toBe('day');
      await userEvent.click(document.body);
      await settle();
      expect(outputs(host)[2]).toBe('yes');
    });

    it('takes programmatic writes, reset and disable in Reactive Forms without a user change', async () => {
      const element = await render();
      const host = group(element, 'Calendar view, Reactive Forms');
      const [setDay, reset, toggle] = Array.from(
        demoOf(host).querySelectorAll<HTMLButtonElement>('.actions button'),
      );
      await userEvent.click(setDay);
      await settle();
      expect(checked(host)).toEqual(['Day']);
      expect(outputs(host)[1]).toBe('no');
      await userEvent.click(reset);
      await settle();
      expect(checked(host)).toEqual([]);
      expect(getComputedStyle(host.querySelector('.ck-segmented__indicator')!).display).toBe(
        'none',
      );
      await userEvent.click(toggle);
      await settle();
      expect(host.getAttribute('aria-disabled')).toBe('true');
      expect(toggle.textContent!.trim()).toBe('Enable');
      segments(host)[0].click();
      await settle();
      expect(checked(host)).toEqual([]);
      await userEvent.click(toggle);
      await settle();
      expect(host.hasAttribute('aria-disabled')).toBe(false);
    });

    it('moves the ngModel control by click and key', async () => {
      const element = await render();
      const host = group(element, 'Calendar view, ngModel');
      await userEvent.click(segments(host)[0]);
      await settle();
      expect(checked(host)).toEqual(['Day']);
      expect(outputs(host)).toEqual(['day']);
      await userEvent.keyboard('{ArrowLeft}');
      await settle();
      expect(checked(host)).toEqual(['Month']);
      expect(outputs(host)).toEqual(['month']);
    });

    it('moves the Signal Forms control by click and key and marks it touched on blur', async () => {
      const element = await render();
      const host = group(element, 'Calendar view, Signal Forms');
      await userEvent.click(segments(host)[2]);
      await settle();
      expect(outputs(host)).toEqual(['month', 'no']);
      await userEvent.keyboard('{Home}');
      await settle();
      expect(outputs(host)[0]).toBe('day');
      await userEvent.click(document.body);
      await settle();
      expect(outputs(host)).toEqual(['day', 'yes']);
    });
  });

  describe('the examples', () => {
    it('start with nothing selected, then select and clear again', async () => {
      const element = await render();
      const host = group(element, 'Priority');
      expect(checked(host)).toEqual([]);
      expect(getComputedStyle(host.querySelector('.ck-segmented__indicator')!).display).toBe(
        'none',
      );
      expect(outputs(host)).toEqual(['none']);
      await userEvent.click(segments(host)[1]);
      await settle();
      expect(outputs(host)).toEqual(['normal']);
      const clear = demoOf(host).querySelector<HTMLButtonElement>('button')!;
      await userEvent.click(clear);
      await settle();
      expect(checked(host)).toEqual([]);
      expect(outputs(host)).toEqual(['none']);
    });

    it('switches the language and the lang of the text with it', async () => {
      const element = await render();
      const host = group(element, 'Language');
      expect(segments(host).map((segment) => segment.getAttribute('lang'))).toEqual(['de', 'en']);
      const text = demoOf(host).querySelector('.status')!;
      expect(text.textContent!.trim()).toBe('Good day');
      expect(text.getAttribute('lang')).toBe('en');
      await userEvent.click(segments(host)[0]);
      await settle();
      expect(text.textContent!.trim()).toBe('Guten Tag');
      expect(text.getAttribute('lang')).toBe('de');
    });

    it('skips the disabled segment with the arrow keys and ignores the disabled group', async () => {
      const element = await render();
      const host = group(element, 'Plan');
      segments(host)[0].focus();
      await userEvent.keyboard('{ArrowRight}');
      await settle();
      expect(checked(host)).toEqual(['Company']);
      expect(document.activeElement).toBe(segments(host)[2]);
      const locked = group(element, 'Plan, unavailable');
      expect(locked.getAttribute('aria-disabled')).toBe('true');
      segments(locked)[1].click();
      await settle();
      expect(checked(locked)).toEqual(['Free']);
      expect(segments(locked).every((segment) => segment.tabIndex === -1)).toBe(true);
    });

    it('draws the four sizes at the control heights, each segment as tall as the group', async () => {
      const element = await render();
      const expected = { Small: 32, Medium: 40, Large: 48, 'Extra large': 60 } as const;
      for (const [label, height] of Object.entries(expected)) {
        const host = group(element, label);
        expect(host.getBoundingClientRect().height, label).toBe(height);
        for (const segment of segments(host)) {
          expect(segment.getBoundingClientRect().height, label).toBe(height);
        }
      }
    });

    it('lines the group up with a button of the same size', async () => {
      const element = await render();
      const clear = demoOf(group(element, 'Priority')).querySelector<HTMLElement>('button')!;
      expect(clear.getBoundingClientRect().height).toBe(
        group(element, 'Small').getBoundingClientRect().height,
      );
    });

    it('shows icon and text, and icons alone with a name', async () => {
      const element = await render();
      const withText = group(element, 'Layout');
      expect(withText.querySelectorAll('ck-segment svg')).toHaveLength(2);
      expect(segments(withText).map((segment) => segment.textContent!.trim())).toEqual([
        'List',
        'Grid',
      ]);
      const iconOnly = group(element, 'Layout, icons only');
      expect(segments(iconOnly).map((segment) => segment.getAttribute('aria-label'))).toEqual([
        'List',
        'Grid',
      ]);
      for (const segment of segments(iconOnly)) {
        expect(segment.textContent!.trim()).toBe('');
      }
    });

    it('stretches the full width group to its container', async () => {
      const element = await render();
      const full = group(element, 'Calendar view, full width');
      const container = full.parentElement!;
      const padding = getComputedStyle(container);
      expect(full.getBoundingClientRect().width).toBeCloseTo(
        container.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight),
        0,
      );
    });

    it('shows the long labels of the phone group in full and cuts the narrow one', async () => {
      const element = await render();
      const phone = group(element, 'Programs, phone width');
      const phoneLabels = Array.from(phone.querySelectorAll<HTMLElement>('.ck-segment__label'));
      expect(phoneLabels.map((label) => label.textContent)).toEqual([
        'Vordefiniert',
        'Meine',
        'Geteilt',
      ]);
      expect(phoneLabels.filter((label) => label.scrollWidth > label.clientWidth)).toEqual([]);
      expect(phone.getBoundingClientRect().width).toBeLessThanOrEqual(328);
      const narrow = group(element, 'Reporting period, narrow container');
      expect(narrow.getBoundingClientRect().width).toBeLessThanOrEqual(
        narrow.parentElement!.getBoundingClientRect().width,
      );
      await expect.poll(() => narrow.classList.contains('ck-segmented--compact')).toBe(true);
      const labels = Array.from(narrow.querySelectorAll<HTMLElement>('.ck-segment__label'));
      expect(labels.some((label) => label.scrollWidth > label.clientWidth)).toBe(true);
      expect(narrow.scrollWidth).toBeLessThanOrEqual(narrow.clientWidth);
      expect(labels.map((label) => label.textContent)).toEqual([
        'This calendar month',
        'This business quarter',
        'The whole year',
      ]);
    });
  });

  describe('the indicator', () => {
    it('sits inside the selected segment on the page, before and after a change', async () => {
      const element = await render();
      const host = group(element, 'Calendar view');
      const inside = () => {
        const indicator = host.querySelector('.ck-segmented__indicator')!.getBoundingClientRect();
        const segment = segments(host)
          .find((candidate) => candidate.getAttribute('aria-checked') === 'true')!
          .getBoundingClientRect();
        expect(indicator.left).toBeCloseTo(segment.left + 4, 0);
        expect(indicator.width).toBeCloseTo(segment.width - 8, 0);
        expect(indicator.height).toBeCloseTo(host.getBoundingClientRect().height - 8, 0);
      };
      inside();
      await userEvent.click(segments(host)[0]);
      await settle();
      await settleAnimations();
      inside();
      await userEvent.click(segments(host)[2]);
      await settle();
      await settleAnimations();
      inside();
    });

    it('slides over the duration token, and not under reduced motion', async () => {
      const element = await render();
      const host = group(element, 'Calendar view');
      const indicator = host.querySelector<HTMLElement>('.ck-segmented__indicator')!;
      await userEvent.click(segments(host)[0]);
      await settle();
      const [animation] = indicator.getAnimations();
      expect(animation.effect!.getTiming().duration).toBe(200);
      await settleAnimations();
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await expect.poll(() => TestBed.inject(CkMedia).reducedMotion()).toBe(true);
      await userEvent.click(segments(host)[2]);
      await settle();
      expect(indicator.getAnimations()).toHaveLength(0);
    });

    it('is mirrored in right-to-left text', async () => {
      const element = await render();
      const host = group(element, 'Calendar view');
      host.dir = 'rtl';
      await settleAnimations();
      const indicator = host.querySelector('.ck-segmented__indicator')!.getBoundingClientRect();
      const segment = segments(host)[1].getBoundingClientRect();
      expect(indicator.right).toBeCloseTo(segment.right - 4, 0);
      expect(segments(host)[0].getBoundingClientRect().left).toBeGreaterThan(
        segments(host)[2].getBoundingClientRect().left,
      );
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

    it('does not overflow the page at 390px', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const host of Array.from(element.querySelectorAll<HTMLElement>('ck-segmented'))) {
        expect(host.getBoundingClientRect().right, host.ariaLabel!).toBeLessThanOrEqual(390);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, idle and with a disabled group and an empty group', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      await userEvent.click(segments(group(element, 'Priority'))[0]);
      await userEvent.keyboard('{ArrowRight}');
      await settle();
      await settleAnimations();
      await expectNoAxeViolations(element);
    });

    it('meets text contrast for selected, unselected, hovered and disabled segments', async () => {
      setTestTheme(theme);
      const element = await render();
      const host = group(element, 'Calendar view');
      const track = getComputedStyle(host).backgroundColor;
      const indicator = getComputedStyle(
        host.querySelector('.ck-segmented__indicator')!,
      ).backgroundColor;
      const [unchecked, selected] = segments(host);
      expect(contrastRatio(getComputedStyle(selected).color, indicator)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastRatio(getComputedStyle(unchecked).color, track)).toBeGreaterThanOrEqual(4.5);
      const overlay = getComputedStyle(unchecked).getPropertyValue('--ck-color-surface-hover');
      const hovered = compositeOver(overlay.trim(), track);
      expect(contrastRatio(getComputedStyle(unchecked).color, hovered)).toBeGreaterThanOrEqual(4.5);
    });

    it('marks the selected segment without colour: a 3:1 border around the indicator and a shadow', async () => {
      setTestTheme(theme);
      const element = await render();
      const host = group(element, 'Calendar view');
      const track = getComputedStyle(host).backgroundColor;
      const indicator = getComputedStyle(host.querySelector('.ck-segmented__indicator')!);
      expect(indicator.borderTopWidth).toBe('1px');
      expect(contrastRatio(indicator.borderTopColor, track)).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(indicator.borderTopColor, indicator.backgroundColor),
      ).toBeGreaterThanOrEqual(3);
      expect(indicator.boxShadow).not.toBe('none');
      const trackBorder = getComputedStyle(host).boxShadow;
      expect(trackBorder).toContain('inset');
    });

    it('draws the track edge at 3:1 against the page', async () => {
      setTestTheme(theme);
      const element = await render();
      const host = group(element, 'Calendar view');
      const edge = resolveToken(host, '--ck-color-control-border');
      const pageBackground = getComputedStyle(demoOf(host)).backgroundColor;
      expect(contrastRatio(edge, pageBackground)).toBeGreaterThanOrEqual(3);
    });
  });
});
