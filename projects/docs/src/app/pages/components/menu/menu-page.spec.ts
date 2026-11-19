import { ApplicationRef, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkMenu, CkMenuItem } from '@ckui/core/menu';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { MenuPage } from './menu-page';
import { RESET_BREAKS, RESET_SCOPED, SAMPLES } from './menu-samples';

describe('MenuPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [MenuPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(MenuPage);
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

  const demoAfter = (element: HTMLElement, id: string): HTMLElement =>
    element.querySelector<HTMLElement>(`#${id} ~ .demo`)!;
  const outputs = (demo: Element): string[] =>
    Array.from(demo.querySelectorAll('output'), (output) => output.textContent!);
  const menuItems = (): HTMLButtonElement[] =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('ck-menu [role="menuitem"]'));
  const wait = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

  /** A popover closes when its anchor is out of view, so a demo further down is scrolled to first. */
  async function open(trigger: HTMLElement): Promise<void> {
    trigger.scrollIntoView({ block: 'center' });
    trigger.focus();
    trigger.click();
    await settle();
    await wait(30);
  }

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
    expect(typescript.map(([name]) => name)).toEqual(['basics', 'disabled', 'confirm', 'events']);
    const needs: [string, string, RegExp?][] = [
      ['Component', '@angular/core'],
      ['signal', '@angular/core', /\bsignal[<(]/],
      ['inject', '@angular/core', /\binject[<(]/],
      ['CK_MENU_IMPORTS', '@ckui/core/menu'],
      ['CkButton', '@ckui/core/button', /\bckButton\b/],
      ['CK_DIALOG_IMPORTS', '@ckui/core/dialog', /\bckDialog/],
      ['CkDialog', '@ckui/core/dialog', /\bCkDialog\b|this\.dialog|inject\(CkDialog/],
    ];
    for (const [name, sample] of typescript) {
      const lines = sample.split('\n');
      const importLines = lines.filter((line) => line.startsWith('import '));
      const body = lines.filter((line) => !line.startsWith('import ')).join('\n');
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
        for (const identifier of /\{([^}]*)\}/
          .exec(line)![1]
          .split(',')
          .map((part) => part.trim())) {
          expect(body, `${name} imports ${identifier}`).toMatch(new RegExp(`\\b${identifier}\\b`));
        }
      }
      expect(body.trim().startsWith('@Component'), `${name} has no stray top-level code`).toBe(
        true,
      );
      expect(sample, name).toMatch(/export class \w+ \{/);
      // Every class the template of a sample names is declared in it or imported.
      expect(sample, name).toMatch(/imports: \[[^\]]*CK_MENU_IMPORTS[^\]]*\]|CK_DIALOG_IMPORTS/);
      expect(sample, name).not.toMatch(/\binject\(.*\)\s*;\s*\n\s*\n?\s*@Component/);
      // Names used in a template exist as members or loop variables.
      for (const [, member] of body.matchAll(/\(click\)="(?:trigger\.)?(\w+)\(/g)) {
        if (member === 'isOpen' || member === 'open' || member === 'close') {
          continue;
        }
        expect(body, `${name} declares ${member}`).toMatch(
          new RegExp(`(protected|private|readonly|async)\\s+(async\\s+)?${member}\\b`),
        );
      }
    }
    // State that changes after a callback is a signal, so the samples work in a zoneless app.
    expect(SAMPLES.basics).toContain('signal');
    expect(SAMPLES.events).toContain('signal');
    expect(SAMPLES.basics).toContain('tone="danger"');
    expect(SAMPLES.basics).toContain('<ck-menu-divider />');
    expect(SAMPLES.basics).toContain('iconOnly');
    expect(SAMPLES.disabled).toContain('ckMenuItem disabled');
    expect(SAMPLES.confirm).toContain('this.dialog.open');
    expect(SAMPLES.events).toContain('#trigger="ckMenuTrigger"');
    expect(SAMPLES.tokens).toContain('--ck-menu-item-fg-danger');
    expect(SAMPLES.tokens).toMatch(/:root,\s*\[data-ck-theme='light'\]/);
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

  it('documents every input of the menu, the item and the trigger', async () => {
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
    expect(documented(0)).toEqual(
      ['ckMenuTrigger', 'menuOpened', 'menuClosed', 'open()', 'close()', 'isOpen'].sort(),
    );
    expect(documented(1)).toEqual(declared(CkMenu));
    expect(documented(2)).toEqual(declared(CkMenuItem));
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('names every menu button on the page', async () => {
    const element = await render();
    const triggers = Array.from(
      element.querySelectorAll<HTMLButtonElement>('[aria-haspopup="menu"]'),
    );
    expect(triggers.length).toBe(6);
    for (const trigger of triggers) {
      const name = trigger.getAttribute('aria-label') ?? trigger.textContent;
      expect(name?.trim(), trigger.outerHTML).toBeTruthy();
    }
  });

  describe('the examples', () => {
    it('opens the row actions with an icon-only button, names it by the row, and runs the pick', async () => {
      const element = await render();
      const demo = demoAfter(element, 'row-actions');
      const trigger = demo.querySelectorAll<HTMLButtonElement>('[aria-haspopup="menu"]')[1];
      expect(trigger.getAttribute('aria-label')).toBe('Actions for Sweet Spot');
      expect(outputs(demo)).toEqual(['nothing yet']);
      await open(trigger);
      expect(menuItems().map((item) => item.textContent!.trim())).toEqual([
        'Start',
        'Edit',
        'Copy',
        'Delete',
      ]);
      expect(document.querySelectorAll('ck-menu-divider')).toHaveLength(1);
      expect(menuItems()[3].classList.contains('ck-menu-item--danger')).toBe(true);
      expect(menuItems()[0].querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
      menuItems()[1].click();
      await settle();
      await wait(350);
      expect(outputs(demo)).toEqual(['Edit Sweet Spot']);
      expect(document.querySelector('ck-menu')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('opens from the keyboard and picks the last item with ArrowUp then Enter', async () => {
      const element = await render();
      const demo = demoAfter(element, 'row-actions');
      const trigger = demo.querySelectorAll<HTMLButtonElement>('[aria-haspopup="menu"]')[0];
      trigger.scrollIntoView({ block: 'center' });
      trigger.focus();
      await userEvent.keyboard('{ArrowUp}');
      await settle();
      await wait(30);
      expect(document.activeElement).toBe(menuItems()[3]);
      await userEvent.keyboard('{Enter}');
      await settle();
      expect(outputs(demo)).toEqual(['Delete Zone 2']);
    });

    it('keeps a disabled item reachable and does nothing with it', async () => {
      const element = await render();
      const demo = demoAfter(element, 'disabled');
      await open(demo.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!);
      expect(menuItems()[2].getAttribute('aria-disabled')).toBe('true');
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      expect(document.activeElement).toBe(menuItems()[2]);
      await userEvent.keyboard('{Enter}');
      await settle();
      expect(outputs(demo)).toEqual(['nothing yet']);
      expect(document.querySelector('ck-menu')).not.toBeNull();
      await userEvent.keyboard('{ArrowUp}{Enter}');
      await settle();
      expect(outputs(demo)).toEqual(['CSV']);
    });

    it('opens the confirm dialog from the danger item on a page without the menu, and returns focus', async () => {
      const element = await render();
      const demo = demoAfter(element, 'confirm');
      const trigger = demo.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
      await open(trigger);
      menuItems()[1].click();
      await settle();
      await wait(350);
      expect(document.querySelector('ck-menu')).toBeNull();
      const dialog = document.querySelector<HTMLElement>('.ck-dialog-panel')!;
      expect(dialog.getAttribute('role')).toBe('alertdialog');
      document.querySelector<HTMLElement>('[ckdialogclose="delete"]')!.click();
      await settle();
      await wait(350);
      expect(outputs(demo)).toEqual(['delete Sweet Spot']);
      expect(document.activeElement).toBe(trigger);
    });

    it('counts the opened and closed events and opens from outside the button', async () => {
      const element = await render();
      const demo = demoAfter(element, 'events');
      const [sort, toggle] = Array.from(demo.querySelectorAll<HTMLButtonElement>('button'));
      expect(outputs(demo)).toEqual(['0', '0']);
      await open(sort);
      expect(outputs(demo)).toEqual(['1', '0']);
      await userEvent.keyboard('{Escape}');
      await settle();
      await wait(350);
      expect(outputs(demo)).toEqual(['1', '1']);
      toggle.click();
      await settle();
      await wait(30);
      expect(sort.getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(menuItems()[2]);
      toggle.click();
      await settle();
      expect(outputs(demo)).toEqual(['2', '2']);
    });
  });

  describe('global resets', () => {
    function applyReset(css: string): void {
      const style = document.createElement('style');
      style.dataset['testReset'] = '';
      style.textContent = css;
      document.head.appendChild(style);
    }

    it('shows a reset that really removes the padding of the rows', async () => {
      const element = await render();
      await open(
        demoAfter(element, 'disabled').querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!,
      );
      const row = menuItems()[0];
      expect(getComputedStyle(row).paddingLeft).not.toBe('0px');
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(row).paddingLeft).toBe('0px');
    });

    it('shows a scoped reset that leaves the menu alone but still hits other buttons', async () => {
      const element = await render();
      await open(
        demoAfter(element, 'disabled').querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!,
      );
      const row = menuItems()[0];
      const other = demoAfter(element, 'events').querySelector<HTMLElement>('button')!;
      const padding = getComputedStyle(row).paddingLeft;
      expect(getComputedStyle(other).borderTopWidth).not.toBe('0px');
      applyReset(RESET_SCOPED.split('/* Or declare')[0]);
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
        for (const item of Array.from(header.querySelectorAll('code'))) {
          expect(item.getClientRects().length, header.textContent!).toBe(1);
        }
      }
    });

    it('does not overflow the page at 390px', async () => {
      await page.viewport(390, 844);
      const element = await render();
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      for (const trigger of Array.from(
        element.querySelectorAll<HTMLElement>('[aria-haspopup="menu"]'),
      )) {
        expect(trigger.getBoundingClientRect().right).toBeLessThanOrEqual(390);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, closed and with a menu open', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      await open(
        demoAfter(element, 'row-actions').querySelector<HTMLButtonElement>(
          '[aria-haspopup="menu"]',
        )!,
      );
      await settleAnimations();
      await expectNoAxeViolations(element);
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });
  });
});
