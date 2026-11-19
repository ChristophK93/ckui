import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { contrastRatio } from '../../../../../../core/testing/contrast';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { DialogPage } from './dialog-page';
import { SAMPLES } from './dialog-samples';

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

describe('DialogPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [DialogPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(DialogPage);
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
  const panels = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('.ck-dialog-panel'));
  const outputs = (element: HTMLElement): string[] =>
    Array.from(element.querySelectorAll('.demo output'), (output) => output.textContent!.trim());
  const closeTopDialog = async (): Promise<void> => {
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(panels()).toHaveLength(0));
    await settle();
  };

  afterEach(async () => {
    TestBed.resetTestingModule();
    document.body.replaceChildren();
    resetTestTheme();
    await emulate([]);
    await page.viewport(800, 600);
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
      'service',
      'template',
      'alert',
      'scrolling',
      'fullHeight',
      'modes',
      'injector',
    ]);
    const needs: [string, string][] = [
      ['Component', '@angular/core'],
      ['inject', '@angular/core'],
      ['signal', '@angular/core'],
      ['Injector', '@angular/core'],
      ['Injectable', '@angular/core'],
      ['CkButton', '@ckui/core/button'],
      ['CkDialog', '@ckui/core/dialog'],
      ['CkDialogRef', '@ckui/core/dialog'],
      ['CK_DIALOG_DATA', '@ckui/core/dialog'],
      ['CK_DIALOG_IMPORTS', '@ckui/core/dialog'],
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
      // inject() only as a field initialiser inside a class, never at top level
      const outside = sample.slice(0, sample.indexOf('export class'));
      expect(outside, name).not.toMatch(/\binject\(/);
      expect(sample, name).not.toMatch(/^(const|let) \w+ = (inject|await)/m);
    }
    expect(SAMPLES.alert).toContain("role: 'alertdialog'");
    expect(SAMPLES.alert).toContain('ckDialogInitialFocus');
    expect(SAMPLES.template).toContain('[(open)]');
    expect(SAMPLES.fullHeight).toContain('fullHeight: true');
    expect(SAMPLES.injector).toContain('injector: this.injector');
    expect(SAMPLES.service).toContain('name.set(result)');
    for (const name of ['reset', 'tokens'] as const) {
      expect(SAMPLES[name], name).toContain('{');
    }
    for (const token of [
      '--ck-dialog-bg',
      '--ck-dialog-radius',
      '--ck-dialog-padding',
      '--ck-dialog-max-width',
      '--ck-dialog-shadow',
    ]) {
      expect(SAMPLES.tokens).toContain(token);
    }
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

  it('documents every option, method and input of the public API', async () => {
    const element = await render();
    const names = Array.from(element.querySelectorAll('#api + .table-scroll tbody tr'), (row) =>
      [
        row.querySelectorAll('td')[0].textContent!.trim(),
        row.querySelector('th')!.textContent!.trim(),
      ].join('.'),
    );
    const config = [
      'role',
      'width',
      'dismissible',
      'closeButton',
      'mode',
      'fullHeight',
      'ariaLabel',
    ];
    expect(names.sort()).toEqual(
      [
        'CkDialogConfig.data',
        'CkDialogConfig.injector',
        ...config.map((name) => `CkDialogConfig.${name}`),
        'CkDialog.open(content, config)',
        'CkDialog.closeAll()',
        'CkDialogRef.close(result?)',
        'CkDialogRef.closed',
        'ck-dialog.open',
        ...config.map((name) => `ck-dialog.${name}`),
        'ck-dialog.closed',
        'token.CK_DIALOG_DATA',
      ].sort(),
    );
    const parts = Array.from(
      element.querySelectorAll('[aria-label="Parts of the dialog"] tbody th'),
      (header) => header.textContent!.trim(),
    );
    expect(parts).toEqual(
      expect.arrayContaining([
        'CK_DIALOG_IMPORTS',
        '[ckDialogTitle]',
        '[ckDialogDescription]',
        'ck-dialog-body',
        'ck-dialog-actions',
        '[ckDialogClose]="result"',
        '[ckDialogInitialFocus]',
      ]),
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
    it('opens the rename dialog with its data, and keeps the new name', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Rename workout'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      const input = panels()[0].querySelector<HTMLInputElement>('.rename-input')!;
      expect(input.value).toBe('Leg day');
      input.value = 'Pull day';
      await userEvent.click(
        Array.from(panels()[0].querySelectorAll('button')).find(
          (b) => b.textContent!.trim() === 'Save',
        )!,
      );
      await vi.waitFor(() => expect(outputs(element)[0]).toBe('Pull day'));
    });

    it('keeps the old name when the rename dialog is dismissed', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Rename workout'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      await closeTopDialog();
      expect(outputs(element)[0]).toBe('Leg day');
    });

    it('focuses the least destructive action of the alertdialog and reports the answer', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Delete workout'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      await settle();
      expect(panels()[0].getAttribute('role')).toBe('alertdialog');
      expect(document.activeElement!.textContent!.trim()).toBe('Keep it');
      expect(panels()[0].querySelector('.ck-dialog__close')).toBeNull();
      await userEvent.keyboard('{Enter}');
      await vi.waitFor(() => expect(outputs(element)).toContain('keep'));
    });

    it('opens the template dialog on click and reports its result', async () => {
      const element = await render();
      expect(panels()).toHaveLength(0);
      await userEvent.click(button(element, 'Settings'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      await userEvent.click(
        Array.from(panels()[0].querySelectorAll('button')).find(
          (b) => b.textContent!.trim() === 'Save',
        )!,
      );
      await vi.waitFor(() => expect(outputs(element)).toContain('save'));
      await vi.waitFor(() => expect(panels()).toHaveLength(0));
      await userEvent.click(button(element, 'Settings'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      await closeTopDialog();
      await vi.waitFor(() => expect(outputs(element)).toContain('dismissed'));
    });

    it('scrolls only the body of the terms dialog and keeps title and actions in view', async () => {
      await page.viewport(1000, 420);
      const element = await render();
      await userEvent.click(button(element, 'Read the terms'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      await settle();
      const panel = panels()[0];
      const body = panel.querySelector<HTMLElement>('.ck-dialog-body')!;
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
      body.scrollTop = 9999;
      expect(panel.querySelector('h2')!.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
      expect(
        panel.querySelector('.ck-dialog-actions')!.getBoundingClientRect().bottom,
      ).toBeLessThanOrEqual(420);
      expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(420);
    });

    it('opens forced sheets and modals, and a full-height sheet that fills the screen', async () => {
      await page.viewport(390, 844);
      const element = await render();
      await userEvent.click(button(element, 'Open as sheet'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      expect(panels()[0].classList.contains('ck-overlay--sheet')).toBe(true);
      const contentHeight = panels()[0].getBoundingClientRect().height;
      expect(contentHeight).toBeLessThan(400);
      await closeTopDialog();
      await userEvent.click(button(element, 'Open as modal'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      expect(panels()[0].classList.contains('ck-overlay--modal')).toBe(true);
      expect(panels()[0].getBoundingClientRect().width).toBeLessThanOrEqual(390 - 32);
      await closeTopDialog();
      await userEvent.click(button(element, 'Open full height'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      await settle();
      const sheetOrModal = panels()[0];
      if (sheetOrModal.classList.contains('ck-overlay--sheet')) {
        expect(Math.round(sheetOrModal.getBoundingClientRect().height)).toBe(844);
      }
    });

    it('closes its dialogs when the page is destroyed', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Read the terms'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      TestBed.resetTestingModule();
      expect(panels()).toHaveLength(0);
      expect(document.querySelector('.cdk-overlay-container')?.childElementCount ?? 0).toBe(0);
    });
  });

  describe('with the shipped stylesheet', () => {
    it('stacks the dialog with the real z-index token and paints it with a shadow', async () => {
      const element = await render();
      await userEvent.click(button(element, 'Open as modal'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      expect(getComputedStyle(document.querySelector('.cdk-overlay-container')!).zIndex).toBe(
        '1000',
      );
      expect(getComputedStyle(panels()[0]).boxShadow).not.toBe('none');
      expect(getComputedStyle(panels()[0]).borderTopLeftRadius).toBe('16px');
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

    it.each(['Open as modal', 'Open as sheet', 'Delete workout', 'Read the terms'] as const)(
      'has no axe violations with the "%s" dialog open',
      async (label) => {
        setTestTheme(theme);
        const element = await render();
        await userEvent.click(button(element, label));
        await settle();
        await vi.waitFor(() => expect(panels()).toHaveLength(1));
        await settle();
        await settleAnimations();
        await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
      },
    );

    it('meets 4.5:1 for title and description on the panel', async () => {
      setTestTheme(theme);
      const element = await render();
      await userEvent.click(button(element, 'Delete workout'));
      await settle();
      await vi.waitFor(() => expect(panels()).toHaveLength(1));
      await settleAnimations();
      const panel = panels()[0];
      const surface = getComputedStyle(panel).backgroundColor;
      expect(
        contrastRatio(getComputedStyle(panel.querySelector('h2')!).color, surface),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(
          getComputedStyle(panel.querySelector('.ck-dialog__description')!).color,
          surface,
        ),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('draws a border around the panel in forced-colors mode', async () => {
    const element = await render();
    await userEvent.click(button(element, 'Open as modal'));
    await settle();
    await vi.waitFor(() => expect(panels()).toHaveLength(1));
    await emulate([{ name: 'forced-colors', value: 'active' }]);
    const style = getComputedStyle(panels()[0]);
    expect(style.borderTopWidth).toBe('1px');
    expect(style.borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('opens without an animation under reduced motion, and with one otherwise', async () => {
    const element = await render();
    await userEvent.click(button(element, 'Open as modal'));
    await settle();
    await vi.waitFor(() => expect(panels()).toHaveLength(1));
    expect(panels()[0].getAnimations().length).toBeGreaterThan(0);
    await closeTopDialog();
    await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await userEvent.click(button(element, 'Open as modal'));
    await settle();
    await vi.waitFor(() => expect(panels()).toHaveLength(1));
    expect(panels()[0].getAnimations()).toHaveLength(0);
  });
});
