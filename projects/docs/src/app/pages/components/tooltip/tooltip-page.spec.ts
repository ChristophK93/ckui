import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CkTooltip } from '@ckui/core/tooltip';
import { page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../../../../core/testing/axe';
import { resetTestTheme, setTestTheme, settleAnimations } from '../../../testing/theme-env';
import { TooltipPage } from './tooltip-page';
import { RESET_BREAKS, RESET_SCOPED, SAMPLES } from './tooltip-samples';

describe('TooltipPage', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [TooltipPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(TooltipPage);
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
  const bubbles = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('.ck-tooltip-layer > .ck-tooltip'));
  const shown = (): HTMLElement[] => bubbles().filter((bubble) => bubble.matches(':popover-open'));
  const wait = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

  /** Tabs forward from a sentinel before the page until the element has focus. */
  async function keyboardFocus(element: HTMLElement): Promise<void> {
    element.scrollIntoView({ block: 'center' });
    document.querySelector<HTMLElement>('#sentinel')!.focus();
    for (let step = 0; step < 40 && document.activeElement !== element; step++) {
      await userEvent.tab();
    }
    expect(document.activeElement).toBe(element);
  }

  beforeEach(() => {
    const sentinel = document.createElement('button');
    sentinel.id = 'sentinel';
    sentinel.textContent = 'Sentinel';
    document.body.prepend(sentinel);
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    document.body.replaceChildren();
    document.head.querySelectorAll('style[data-test-reset]').forEach((style) => style.remove());
    resetTestTheme();
    await page.viewport(800, 600);
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
    expect(typescript.map(([name]) => name)).toEqual(['basics', 'positions', 'dialog', 'control']);
    const needs: [string, string, RegExp?][] = [
      ['Component', '@angular/core'],
      ['signal', '@angular/core', /\bsignal[<(]/],
      ['inject', '@angular/core', /\binject[<(]/],
      ['CK_TOOLTIP_IMPORTS', '@ckui/core/tooltip'],
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
      expect(sample, name).toMatch(/imports: \[[^\]]*CK_TOOLTIP_IMPORTS[^\]]*\]|CK_DIALOG_IMPORTS/);
      expect(sample, name).toMatch(/export class \w+/);
      // inject() only as a field initialiser inside a class, never at top level or in a method
      const outside = sample.slice(0, sample.indexOf('export class'));
      expect(outside, name).not.toMatch(/\binject\(/);
      expect(sample, name).not.toMatch(/^\s*(const|let) \w+ = (inject|await)/m);
      // Names used in a template exist as members of its class.
      for (const [, member] of body.matchAll(/\(click\)="(?:tip\.)?(\w+)\(/g)) {
        if (['isVisible', 'show', 'hide', 'set'].includes(member)) {
          continue;
        }
        expect(body, `${name} declares ${member}`).toMatch(
          new RegExp(`(protected|private|readonly|async)\\s+(async\\s+)?${member}\\b`),
        );
      }
    }
    // State that changes after a callback is a signal, so the samples work in a zoneless app.
    expect(SAMPLES.control).toContain('signal(');
    expect(SAMPLES.control).toContain('#tip="ckTooltip"');
    expect(SAMPLES.basics).toContain('aria-label="Rest timer"');
    expect(SAMPLES.dialog).toContain('this.dialog.open');
    expect(SAMPLES.tokens).toContain('--ck-tooltip-max-width');
    expect(SAMPLES.tokens).toMatch(/:root,\s*\[data-ck-theme='light'\]/);
    expect(SAMPLES.reset).toContain('{');
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

  it('documents every input and method of the directive, and nothing else', async () => {
    const element = await render();
    const documented = Array.from(
      element.querySelectorAll('#api ~ .table-scroll')[0].querySelectorAll('tbody th'),
      (header) => header.textContent!.trim(),
    );
    // The compiled definition maps each public (alias) name to its class property.
    const inputs = Object.keys(
      (CkTooltip as unknown as { ɵdir: { inputs: Record<string, unknown> } }).ɵdir.inputs,
    );
    expect(documented.slice(0, 4).sort()).toEqual([...inputs].sort());
    expect(documented.slice(4)).toEqual(['show()', 'hide()', 'isVisible']);
    expect(typeof CkTooltip.prototype.show).toBe('function');
    expect(typeof CkTooltip.prototype.hide).toBe('function');
  });

  it('labels every table with a caption and column headers', async () => {
    const element = await render();
    for (const table of Array.from(element.querySelectorAll('table'))) {
      expect(table.querySelector('caption')?.textContent?.trim()).toBeTruthy();
      expect(table.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(0);
    }
  });

  it('names every tooltip button on the page', async () => {
    const element = await render();
    const hosts = Array.from(element.querySelectorAll<HTMLElement>('button')).filter(
      (button) => button.closest('.demo') !== null,
    );
    expect(hosts.length).toBeGreaterThan(8);
    for (const host of hosts) {
      const name = host.getAttribute('aria-label') ?? host.textContent;
      expect(name?.trim(), host.outerHTML).toBeTruthy();
    }
  });

  describe('the examples', () => {
    it('keeps the name of each icon button and describes it, except the one that repeats its name', async () => {
      const element = await render();
      const [timer, edit, copy, remove] = Array.from(
        demoAfter(element, 'icon-buttons').querySelectorAll<HTMLButtonElement>('button'),
      );
      const description = (host: HTMLElement) =>
        document.getElementById(host.getAttribute('aria-describedby') ?? 'none')?.textContent;
      expect(timer.getAttribute('aria-label')).toBe('Rest timer');
      expect(description(timer)).toBe('Starts after each set');
      expect(description(edit)).toBe('Changes blocks and targets');
      expect(description(copy)).toBe('Makes a copy you can change');
      expect(remove.hasAttribute('aria-describedby')).toBe(false);
      expect(bubbles()).toHaveLength(10);
    });

    it('shows a tooltip on keyboard focus and hides it on Escape and on moving on', async () => {
      const element = await render();
      const [timer, edit] = Array.from(
        demoAfter(element, 'icon-buttons').querySelectorAll<HTMLButtonElement>('button'),
      );
      await keyboardFocus(timer);
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Starts after each set']);
      await userEvent.keyboard('{Escape}');
      expect(shown()).toHaveLength(0);
      await userEvent.tab();
      expect(document.activeElement).toBe(edit);
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Changes blocks and targets']);
      await userEvent.tab();
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Makes a copy you can change']);
    });

    it('puts the bubble on the side each position button asks for', async () => {
      const element = await render();
      const buttons = Array.from(
        demoAfter(element, 'positions').querySelectorAll<HTMLButtonElement>('button'),
      );
      const sides: string[] = [];
      for (const button of buttons) {
        await keyboardFocus(button);
        sides.push(
          Array.from(shown()[0].classList)
            .find((name) => name.startsWith('ck-tooltip--'))!
            .replace('ck-tooltip--', ''),
        );
      }
      // At 800px the buttons have room on both sides, so the text direction decides: LTR here.
      expect(sides).toEqual(['above', 'below', 'start', 'end']);
    });

    it('hides only the tooltip on the first Escape inside the dialog and closes the dialog on the second', async () => {
      const element = await render();
      demoAfter(element, 'dialog').querySelector<HTMLButtonElement>('button')!.click();
      await settle();
      await wait(350);
      const settings = document.querySelector<HTMLButtonElement>('[aria-label="Settings"]')!;
      expect(settings).not.toBeNull();
      document.querySelector<HTMLElement>('.ck-dialog-panel button[ckdialogclose]')!.focus();
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(settings);
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Rest and warm-up lengths']);
      await userEvent.keyboard('{Escape}');
      await settle();
      expect(shown()).toHaveLength(0);
      expect(document.querySelector('.ck-dialog-panel')).not.toBeNull();
      await userEvent.keyboard('{Escape}');
      await settle();
      await wait(350);
      expect(document.querySelector('.ck-dialog-panel')).toBeNull();
    });

    it('follows a text change, hides when muted and shows from outside', async () => {
      const element = await render();
      const [host, toggle, change, mute] = Array.from(
        demoAfter(element, 'control').querySelectorAll<HTMLButtonElement>('button'),
      );
      toggle.click();
      await settle();
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Starts after each set']);
      change.click();
      await settle();
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Changed while it is open']);
      mute.click();
      await settle();
      expect(shown()).toHaveLength(0);
      expect(host.hasAttribute('aria-describedby')).toBe(false);
      toggle.click();
      await settle();
      expect(shown()).toHaveLength(0);
      expect(mute.textContent!.trim()).toBe('Unmute tooltips');
      mute.click();
      await settle();
      toggle.click();
      await settle();
      expect(shown()).toHaveLength(1);
    });

    it('shows a tooltip on a disabled button for the mouse only', async () => {
      const element = await render();
      const demo = demoAfter(element, 'disabled-buttons');
      const disabled = demo.querySelector<HTMLButtonElement>('button')!;
      expect(disabled.disabled).toBe(true);
      disabled.scrollIntoView({ block: 'center' });
      await userEvent.hover(disabled);
      await wait(700);
      expect(shown().map((bubble) => bubble.textContent)).toEqual(['Needs a connected trainer']);
      await userEvent.unhover(disabled);
      await wait(250);
      document.querySelector<HTMLElement>('#sentinel')!.focus();
      await userEvent.tab();
      expect(document.activeElement).not.toBe(disabled);
      expect(demo.textContent).toContain('Connect a trainer to start a ride.');
    });
  });

  describe('global resets', () => {
    function applyReset(css: string): void {
      const style = document.createElement('style');
      style.dataset['testReset'] = '';
      style.textContent = css;
      document.head.appendChild(style);
    }

    async function showFirst(element: HTMLElement): Promise<HTMLElement> {
      await keyboardFocus(
        demoAfter(element, 'icon-buttons').querySelector<HTMLButtonElement>('button')!,
      );
      await wait(150);
      return shown()[0];
    }

    it('shows a reset that really removes the padding and the fill of the bubble', async () => {
      const element = await render();
      const bubble = await showFirst(element);
      expect(getComputedStyle(bubble).paddingLeft).not.toBe('0px');
      expect(getComputedStyle(bubble).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(bubble).paddingLeft).toBe('0px');
      expect(getComputedStyle(bubble).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('shows a scoped reset that leaves the bubble alone but still hits other elements', async () => {
      const element = await render();
      const bubble = await showFirst(element);
      const padding = getComputedStyle(bubble).paddingLeft;
      const fill = getComputedStyle(bubble).backgroundColor;
      const other = element.querySelector<HTMLElement>('#positions + p')!;
      applyReset(RESET_BREAKS);
      expect(getComputedStyle(other).marginTop).toBe('0px');
      document.head.querySelectorAll('style[data-test-reset]').forEach((style) => style.remove());
      applyReset(RESET_SCOPED.split('/* Or declare')[0]);
      expect(getComputedStyle(bubble).paddingLeft).toBe(padding);
      expect(getComputedStyle(bubble).backgroundColor).toBe(fill);
      expect(getComputedStyle(other).marginTop).toBe('0px');
    });
  });

  describe('table layout', () => {
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
      for (const host of Array.from(element.querySelectorAll<HTMLElement>('.demo button'))) {
        expect(host.getBoundingClientRect().right).toBeLessThanOrEqual(390);
      }
    });

    it('keeps a bubble inside the screen when the last position button is focused at 390px', async () => {
      await page.viewport(390, 844);
      const element = await render();
      const buttons = Array.from(
        demoAfter(element, 'positions').querySelectorAll<HTMLButtonElement>('button'),
      );
      for (const button of buttons) {
        await keyboardFocus(button);
        const box = shown()[0].getBoundingClientRect();
        expect(box.left).toBeGreaterThanOrEqual(8);
        expect(box.right).toBeLessThanOrEqual(390 - 8);
      }
    });
  });

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it('has no axe violations, with a tooltip shown', async () => {
      setTestTheme(theme);
      const element = await render();
      await expectNoAxeViolations(element);
      await keyboardFocus(
        demoAfter(element, 'icon-buttons').querySelector<HTMLButtonElement>('button')!,
      );
      await settleAnimations();
      await wait(150);
      expect(shown()).toHaveLength(1);
      await expectNoAxeViolations(element);
      await expectNoAxeViolations(document.querySelector('.ck-tooltip-layer')!);
    });
  });
});
