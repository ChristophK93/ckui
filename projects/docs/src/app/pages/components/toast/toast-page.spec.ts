import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { contrastRatio, resolveToken } from '../../../../../../core/testing/contrast';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { SAMPLES } from './toast-samples';
import { ToastPage } from './toast-page';

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

describe('ToastPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [ToastPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(ToastPage);
    document.body.appendChild(fixture.nativeElement);
    await settle();
    await settleAnimations();
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    const appRef = TestBed.inject(ApplicationRef);
    await appRef.whenStable();
    appRef.tick();
    await appRef.whenStable();
  }

  const button = (element: HTMLElement, label: string): HTMLButtonElement =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('.demo button')).find(
      (candidate) => candidate.textContent!.trim() === label,
    )!;
  const toasts = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('section.ck-toast-host .ck-toast'));
  const toastText = (toast: HTMLElement): string =>
    Array.from(toast.querySelector('.ck-toast__text')!.children, (line) =>
      line.textContent!.replace(/\s+/g, ' ').trim(),
    ).join(' ');
  const outputs = (element: HTMLElement): string[] =>
    Array.from(element.querySelectorAll('.demo output'), (output) => output.textContent!.trim());
  const lastReason = (element: HTMLElement): string =>
    element.querySelector('#tones + p + .demo output')!.textContent!.trim();

  afterEach(async () => {
    TestBed.resetTestingModule();
    document.body.replaceChildren();
    resetTestTheme();
    await emulate([]);
    await page.viewport(414, 896);
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
      'action',
      'replace',
      'update',
      'queue',
      'config',
      'reasons',
    ]);
    const needs: [string, string][] = [
      ['Component', '@angular/core'],
      ['inject', '@angular/core'],
      ['signal', '@angular/core'],
      ['DestroyRef', '@angular/core'],
      ['ApplicationConfig', '@angular/core'],
      ['CkButton', '@ckui/core/button'],
      ['CkToast', '@ckui/core/toast'],
      ['provideCkToast', '@ckui/core/toast'],
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
      if (name !== 'config') {
        expect(sample, name).toContain('@Component');
        expect(sample, name).toMatch(/export class \w+ \{/);
        // inject() only as a field initialiser inside the class, never in a method or at top level
        const outside = sample.slice(0, sample.indexOf('export class'));
        expect(outside, name).not.toMatch(/\binject\(/);
        expect(sample, name).not.toMatch(/^\s*(const|let) \w+ = (inject|await)/m);
      }
    }
    expect(SAMPLES.reasons).toContain('private restore(): void');
    expect(SAMPLES.reasons).toContain('async archive(): Promise<void>');
    expect(SAMPLES.config).toContain("size: 'lg'");
    for (const name of ['reset', 'tokens'] as const) {
      expect(SAMPLES[name], name).toContain('{');
    }
    expect(SAMPLES.tokens).toContain('--ck-toast-danger-bg');
    expect(SAMPLES.tokens).not.toMatch(/\.ck-toast--danger \{[^}]*--ck-toast-bg/);
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

  it('documents every option, method and setting of the public API', async () => {
    const element = await render();
    const names = Array.from(element.querySelectorAll('#api + .table-scroll tbody tr'), (row) =>
      [
        row.querySelectorAll('td')[0].textContent!.trim(),
        row.querySelector('th')!.textContent!.trim(),
      ].join('.'),
    );
    expect(names.sort()).toEqual(
      [
        'CkToastOptions.message',
        'CkToastOptions.title',
        'CkToastOptions.tone',
        'CkToastOptions.action',
        'CkToastOptions.duration',
        'CkToastOptions.id',
        'CkToastRef.dismiss()',
        'CkToastRef.update(options)',
        'CkToastRef.dismissed',
        'CkToast.show(options)',
        'CkToast.dismissAll()',
        'provideCkToast.position',
        'provideCkToast.align',
        'provideCkToast.max',
        'provideCkToast.size',
      ].sort(),
    );
  });

  it('labels every table with a caption and column headers, and every demo button with text', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
    for (const control of Array.from(element.querySelectorAll('.demo button'))) {
      expect(control.textContent!.trim()).not.toBe('');
    }
  });

  describe('the demos', () => {
    it('shows one toast per tone, with the tone class', async () => {
      const element = await render();
      for (const [label, tone] of [
        ['Neutral', 'neutral'],
        ['Success', 'success'],
        ['Warning', 'warning'],
      ] as const) {
        await userEvent.click(button(element, label));
        await settle();
        expect(toasts().at(-1)!.classList.contains(`ck-toast--${tone}`), label).toBe(true);
      }
      expect(toasts()).toHaveLength(3);
      expect(document.querySelectorAll('section.ck-toast-host')).toHaveLength(1);
      await userEvent.click(button(element, 'Show five'));
      await userEvent.click(button(element, 'Dismiss all'));
      await settle();
      await vi.waitFor(() => expect(toasts()).toHaveLength(0));
      await userEvent.click(button(element, 'Danger'));
      await settle();
      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].classList.contains('ck-toast--danger')).toBe(true);
    });

    it('closes a toast with its dismiss button and reports the reason', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Success'));
      await settle();
      expect(toastText(toasts()[0])).toBe('Saved Your changes are stored.');
      await userEvent.click(toasts()[0].querySelector('.ck-toast__dismiss')!);
      await settle();
      await vi.waitFor(() => expect(toasts()).toHaveLength(0));
      expect(lastReason(element)).toBe('user');
    });

    it('runs the Undo action, closes the toast with the reason action and restores the status', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Archive message'));
      await settle();
      expect(outputs(element)).toContain('Archived');
      await userEvent.click(toasts()[0].querySelector('.ck-toast__action')!);
      await settle();
      expect(outputs(element)).toContain('Restored');
      expect(lastReason(element)).toBe('action');
      await vi.waitFor(() => expect(toasts()).toHaveLength(0));
    });

    it('replaces the bike toast in place and reports replaced', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Disconnect'));
      await settle();
      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].classList.contains('ck-toast--warning')).toBe(true);
      await userEvent.click(button(element, 'Reconnect'));
      await settle();
      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].classList.contains('ck-toast--success')).toBe(true);
      expect(toastText(toasts()[0])).toBe('Bike reconnected');
      expect(lastReason(element)).toBe('replaced');
    });

    it('updates the upload toast after a moment', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Upload'));
      await settle();
      expect(toastText(toasts()[0])).toBe('Uploading 0 of 3 files');
      await vi.waitFor(
        () => {
          expect(toasts().length > 0 && toastText(toasts()[0])).toBe('Uploaded 3 files');
        },
        { timeout: 3000 },
      );
      expect(toasts()[0].classList.contains('ck-toast--success')).toBe(true);
    });

    it('queues five toasts behind three, and dismisses all of them', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Show five'));
      await settle();
      expect(toasts().map(toastText)).toEqual(['Notice 1', 'Notice 2', 'Notice 3']);
      await userEvent.click(button(element, 'Dismiss all'));
      await settle();
      await vi.waitFor(() => expect(toasts()).toHaveLength(0));
      expect(lastReason(element)).toBe('programmatic');
    });

    it('closes its toasts when the page is destroyed', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Danger'));
      await settle();
      expect(toasts()).toHaveLength(1);
      TestBed.resetTestingModule();
      expect(document.querySelector('section.ck-toast-host')).toBeNull();
    });
  });

  describe('with the shipped stylesheet', () => {
    it('stacks the toasts above overlays with the real z-index token', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Neutral'));
      await settle();
      const host = document.querySelector<HTMLElement>('section.ck-toast-host')!;
      expect(getComputedStyle(host).zIndex).toBe('1100');
      expect(getComputedStyle(host).position).toBe('fixed');
      expect(getComputedStyle(toasts()[0]).boxShadow).not.toBe('none');
    });

    it('fits a long toast into 390px without overflowing the page', async () => {
      await page.viewport(390, 844);
      const element = await render();
      await userEvent.click(button(element, 'Show a long toast'));
      await settle();
      await settleAnimations();
      expect(window.innerWidth).toBe(390);
      const [toast] = toasts();
      const box = toast.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390);
      await vi.waitFor(() => expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390));
      const text = toast.querySelector<HTMLElement>('.ck-toast__text')!;
      expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
      expect(text.getBoundingClientRect().height).toBeLessThanOrEqual(0.3 * window.innerHeight + 1);
      for (const control of [
        toast.querySelector('.ck-toast__action')!,
        toast.querySelector('.ck-toast__dismiss')!,
      ]) {
        const controlBox = control.getBoundingClientRect();
        expect(controlBox.right).toBeLessThanOrEqual(box.right);
        expect(controlBox.width).toBeGreaterThanOrEqual(24);
        expect(controlBox.height).toBeGreaterThanOrEqual(24);
      }
    });

    it('does not overflow the page at 390px with the tables', async () => {
      await page.viewport(390, 844);
      await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    });

    it('keeps row headers of the tables on one line at 1280px', async () => {
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
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations on the idle page', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
    });

    it.each(['Neutral', 'Success', 'Warning', 'Danger'] as const)(
      'has no axe violations with a %s toast open',
      async (label) => {
        setTestTheme(theme);
        const element = await render();
        await userEvent.click(button(element, label));
        await settle();
        await settleAnimations();
        await expectNoAxeViolations(document.querySelector('section.ck-toast-host')!);
        await expectNoAxeViolations(element);
      },
    );

    it('meets 4.5:1 for text, action and dismiss button and 3:1 for the icon in every tone', async () => {
      setTestTheme(theme);
      const element = await render();
      for (const label of ['Neutral', 'Success', 'Warning', 'Danger']) {
        await userEvent.click(button(element, label));
        await settle();
        await settleAnimations();
        const toast = toasts().at(-1)!;
        const card = getComputedStyle(toast).backgroundColor;
        const text = getComputedStyle(toast.querySelector('.ck-toast__message, .ck-toast__title')!);
        expect(contrastRatio(text.color, card), label).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(getComputedStyle(toast.querySelector('.ck-toast__dismiss')!).color, card),
          label,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(getComputedStyle(toast.querySelector('.ck-toast__icon')!).color, card),
          label,
        ).toBeGreaterThanOrEqual(3);
        await userEvent.click(button(element, 'Dismiss all'));
        await settle();
      }
      await userEvent.click(button(element, 'Archive message'));
      await settle();
      const toast = toasts().at(-1)!;
      expect(
        contrastRatio(
          getComputedStyle(toast.querySelector('.ck-toast__action')!).color,
          getComputedStyle(toast).backgroundColor,
        ),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it('fills the danger toast with the danger token and its text with on-danger', async () => {
      setTestTheme(theme);
      const element = await render();
      await userEvent.click(button(element, 'Danger'));
      await settle();
      const [toast] = toasts();
      expect(getComputedStyle(toast).backgroundColor).toBe(
        resolveToDisplay(toast, '--ck-color-danger'),
      );
      expect(getComputedStyle(toast).color).toBe(resolveToDisplay(toast, '--ck-color-on-danger'));
    });
  });

  it('draws a border on every tone in forced-colors mode', async () => {
    const element = await render();
    await userEvent.click(button(element, 'Danger'));
    await settle();
    await emulate([{ name: 'forced-colors', value: 'active' }]);
    const style = getComputedStyle(toasts()[0]);
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('slides in over the duration token, and not with reduced motion', async () => {
    const element = await render();
    await userEvent.click(button(element, 'Danger'));
    await settle();
    expect(getComputedStyle(toasts()[0]).animationName).toBe('ck-toast-in');
    expect(getComputedStyle(toasts()[0]).animationDuration).toBe('0.2s');
    await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    expect(getComputedStyle(toasts()[0]).animationName).toBe('none');
  });
});

/** The colour a token resolves to as the browser reports it for `background-color` and `color`. */
function resolveToDisplay(element: Element, token: string): string {
  const probe = document.createElement('span');
  probe.style.color = resolveToken(element, token);
  document.body.appendChild(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}
