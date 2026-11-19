import { TestBed } from '@angular/core/testing';
import { CkMedia } from '@ckui/core/internal';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import {
  MENU_DARK,
  MENU_LIGHT,
  ROW_MENU,
  cancelButton,
  cleanUp,
  fakeMedia,
  items,
  menu,
  mount,
  overlayPanels,
  panel,
  settle,
  trigger,
  wait,
} from '../testing/menu-host';

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

/** The computed colour of a CSS colour keyword (a system colour included) under the current emulation. */
function resolveColor(value: string): string {
  const probe = document.createElement('div');
  probe.style.color = value;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

const rect = (element: Element) => element.getBoundingClientRect();
const style = (element: Element, pseudo?: string) => getComputedStyle(element, pseudo);

describe('CkMenu layout', () => {
  afterEach(async () => {
    cleanUp();
    await emulate([]);
    await (cdp() as unknown as Session)
      .send('Emulation.setTouchEmulationEnabled', { enabled: false })
      .catch(() => undefined);
    await page.viewport(800, 600);
  });

  async function open(
    template = ROW_MENU(),
    prepare?: Parameters<typeof mount>[1],
    tokens?: Parameters<typeof mount>[3],
    byKeyboard = true,
  ) {
    const mounted = mount(template, prepare, undefined, tokens);
    await settle(mounted.fixture);
    const button = trigger(mounted.root);
    if (byKeyboard) {
      button.focus();
      await userEvent.keyboard('{Enter}');
    } else {
      button.click();
    }
    await settle(mounted.fixture);
    return { ...mounted, trigger: button };
  }

  describe('the popover', () => {
    it('is at least 12rem wide, under the trigger, with a border, radius, fill and shadow', async () => {
      const { trigger } = await open();
      const popover = panel()!;
      expect(rect(popover).width).toBeGreaterThanOrEqual(192);
      expect(rect(popover).top).toBeGreaterThanOrEqual(rect(trigger).bottom);
      expect(rect(popover).left).toBeCloseTo(rect(trigger).left, 0);
      expect(style(popover).borderTopWidth).toBe('1px');
      expect(style(popover).borderTopLeftRadius).toBe('8px');
      expect(style(popover).backgroundColor).toBe('rgb(255, 255, 255)');
      expect(style(popover).boxShadow).not.toBe('none');
    });

    it('is not matched to a narrow trigger', async () => {
      const { trigger } = await open();
      expect(rect(trigger).width).toBeLessThan(150);
      expect(rect(panel()!).width).toBeGreaterThan(rect(trigger).width);
    });

    it('takes its look from the menu tokens set on the document', async () => {
      await open(ROW_MENU(), undefined, {
        ...MENU_LIGHT,
        '--ck-menu-bg': 'rgb(1, 2, 3)',
        '--ck-menu-radius': '3px',
        '--ck-menu-shadow': '0 0 0 5px rgb(9, 9, 9)',
        '--ck-menu-min-width': '300px',
        '--ck-menu-item-fg-danger': 'rgb(7, 8, 9)',
      });
      expect(style(panel()!).backgroundColor).toBe('rgb(1, 2, 3)');
      expect(style(panel()!).borderTopLeftRadius).toBe('3px');
      expect(style(panel()!).boxShadow).toContain('rgb(9, 9, 9)');
      expect(rect(panel()!).width).toBeGreaterThanOrEqual(300);
      expect(style(items()[3]).color).toBe('rgb(7, 8, 9)');
    });

    it('scrolls inside a limited height and never grows past the viewport', async () => {
      await open(
        `<button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="Many">Many</button>
         <ng-template #m><ck-menu>
           @for (item of items(); track item.id) { <button ckMenuItem>{{ item.label }}</button> }
         </ck-menu></ng-template>`,
        (host) =>
          host.items.set(
            Array.from({ length: 60 }, (_, index) => ({ id: index, label: `Item ${index}` })),
          ),
      );
      expect(menu()!.scrollHeight).toBeGreaterThan(menu()!.clientHeight);
      expect(rect(panel()!).height).toBeLessThanOrEqual(window.innerHeight);
      await userEvent.keyboard('{End}');
      expect(rect(document.activeElement!).bottom).toBeLessThanOrEqual(rect(menu()!).bottom + 1);
    });

    it('wraps a very long label inside the popover without horizontal overflow', async () => {
      await open(
        `<button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="Long">Long</button>
         <ng-template #m><ck-menu>
           <button ckMenuItem>${'Supercalifragilisticexpialidocious '.repeat(8)}</button>
           <button ckMenuItem>${'x'.repeat(120)}</button>
         </ck-menu></ng-template>`,
      );
      expect(menu()!.scrollWidth).toBeLessThanOrEqual(menu()!.clientWidth);
      expect(rect(panel()!).right).toBeLessThanOrEqual(window.innerWidth);
      for (const item of items()) {
        expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1);
        expect(rect(item).height).toBeGreaterThan(24);
      }
    });

    it('draws the items: default text, danger text, dimmed disabled item, and a divider', async () => {
      await open();
      const [start, , copy, danger] = items();
      expect(style(start).color).toBe('rgb(20, 20, 30)');
      expect(style(danger).color).toBe('rgb(150, 0, 0)');
      expect(style(copy).color).toBe('rgb(150, 150, 160)');
      expect(style(copy).cursor).toBe('not-allowed');
      const divider = menu()!.querySelector('ck-menu-divider')!;
      expect(divider.getAttribute('role')).toBe('separator');
      expect(style(divider).borderTopWidth).toBe('1px');
    });

    it('marks the keyboard-focused item with a fill and a bar at the inline start, not by colour alone', async () => {
      await open();
      const first = items()[0];
      expect(first.matches(':focus-visible')).toBe(true);
      expect(style(first).backgroundImage).toContain('linear-gradient');
      const bar = style(first, '::before');
      expect(bar.content).not.toBe('none');
      expect(bar.backgroundColor).toBe('rgb(0, 0, 255)');
      expect(parseFloat(bar.width)).toBe(4);
      await userEvent.keyboard('{ArrowDown}');
      expect(style(first).backgroundImage).toBe('none');
      expect(style(items()[1], '::before').content).not.toBe('none');
    });

    it('shows a leading icon before the text, hidden from assistive technology', async () => {
      await open(
        `<button type="button" class="trigger" [ckMenuTrigger]="m" aria-label="Icons">Icons</button>
         <ng-template #m><ck-menu>
           <button ckMenuItem><svg ckMenuItemIcon viewBox="0 0 10 10" width="10" height="10"></svg>Start</button>
         </ck-menu></ng-template>`,
      );
      const icon = items()[0].querySelector('svg')!;
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(rect(icon).width).toBeCloseTo(20, 0);
      expect(rect(icon).right).toBeLessThanOrEqual(
        rect(items()[0].querySelector('.ck-menu-item__label')!).left + 1,
      );
      expect(items()[0].textContent!.trim()).toBe('Start');
    });
  });

  describe('hit areas', () => {
    it('makes every row a full-width 44px target under the coarse-pointer tokens', async () => {
      await open(ROW_MENU(), undefined, {
        ...MENU_LIGHT,
        '--ck-target-min': '44px',
        '--ck-control-height-md': '44px',
      });
      for (const item of items()) {
        const box = rect(item);
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeCloseTo(rect(menu()!).width, 0);
        const hit = document.elementFromPoint(box.left + box.width - 3, box.top + box.height / 2);
        expect(hit?.closest('[role="menuitem"]')).toBe(item);
      }
    });

    it('keeps rows at least 24px with the default tokens', async () => {
      await open();
      for (const item of items()) {
        expect(rect(item).height).toBeGreaterThanOrEqual(24);
      }
    });
  });

  describe('right-to-left', () => {
    it('aligns the popover to the trigger edge and puts the bar at the inline start', async () => {
      const { trigger } = await open(
        `<div dir="rtl" style="inline-size: 300px; margin-inline-start: 400px">${ROW_MENU()}</div>`,
      );
      expect(rect(panel()!).right).toBeLessThanOrEqual(window.innerWidth);
      expect(rect(panel()!).right).toBeCloseTo(rect(trigger).right, 0);
      const bar = style(items()[0], '::before');
      expect(bar.insetInlineStart).toBe('0px');
      expect(parseFloat(bar.right)).toBe(0);
    });
  });

  describe('forced colors', () => {
    it('uses system colours: Highlight on HighlightText for the focused item, CanvasText for danger, GrayText for disabled', async () => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      await open();
      const focused = items()[0];
      expect(style(focused).backgroundColor).toBe(resolveColor('Highlight'));
      expect(style(focused).color).toBe(resolveColor('HighlightText'));
      expect(style(focused).backgroundImage).toBe('none');
      expect(style(focused, '::before').backgroundColor).toBe(resolveColor('HighlightText'));
      expect(style(items()[3]).color).toBe(resolveColor('CanvasText'));
      expect(style(items()[2]).color).toBe(resolveColor('GrayText'));
      expect(style(panel()!).borderTopColor).toBe(resolveColor('CanvasText'));
      expect(style(menu()!.querySelector('ck-menu-divider')!).borderTopColor).toBe(
        resolveColor('CanvasText'),
      );
    });

    it('keeps the focused Cancel row visible in the sheet', async () => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      fakeMedia(true);
      await open();
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(cancelButton());
      expect(style(cancelButton()!).backgroundColor).toBe(resolveColor('Highlight'));
      expect(style(cancelButton()!).color).toBe(resolveColor('HighlightText'));
    });
  });

  describe('reduced motion', () => {
    it('opens and closes the popover without an animation', async () => {
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const { fixture, trigger } = await open(ROW_MENU(), undefined, {
        ...MENU_LIGHT,
        '--ck-duration-normal': '300ms',
        '--ck-duration-fast': '300ms',
      });
      const pane = document.querySelector<HTMLElement>('.ck-overlay-pane')!;
      expect(pane.getAnimations()).toEqual([]);
      expect(style(items()[0]).transitionDuration).toBe('0s');
      trigger.click();
      await settle(fixture);
      expect(menu()).toBeNull();
    });

    it('animates the popover otherwise', async () => {
      await open(ROW_MENU(), undefined, { ...MENU_LIGHT, '--ck-duration-normal': '300ms' });
      expect(document.querySelector<HTMLElement>('.ck-overlay-pane')!.getAnimations().length).toBe(
        1,
      );
    });
  });

  describe('as a sheet', () => {
    it('is a bottom sheet with 44px rows, a title and a Cancel row set apart by a line', async () => {
      fakeMedia(true);
      await open(ROW_MENU(), undefined, {
        ...MENU_LIGHT,
        '--ck-control-height-md': '44px',
        '--ck-target-min': '44px',
      });
      const sheet = document.querySelector<HTMLElement>('.ck-overlay--sheet')!;
      expect(rect(sheet).width).toBe(window.innerWidth);
      expect(Math.round(rect(sheet).bottom)).toBe(window.innerHeight);
      expect(style(sheet).borderTopLeftRadius).toBe('16px');
      for (const item of items()) {
        expect(rect(item).height).toBeGreaterThanOrEqual(44);
        expect(rect(item).width).toBeGreaterThanOrEqual(window.innerWidth - 2);
      }
      const cancel = cancelButton()!;
      expect(rect(cancel).height).toBeGreaterThanOrEqual(44);
      expect(rect(cancel).top).toBeGreaterThan(rect(items().at(-1)!).bottom + 4);
      expect(style(cancel.parentElement!).borderTopWidth).toBe('1px');
      expect(style(cancel).textAlign).toBe('center');
      expect(overlayPanels()).toHaveLength(1);
    });

    it('is a real sheet under a coarse pointer in a phone-width window', async () => {
      await page.viewport(390, 844);
      await (cdp() as unknown as Session).send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
        maxTouchPoints: 5,
      });
      await wait(50);
      const { fixture } = await open(ROW_MENU(), undefined, undefined, false);
      expect(TestBed.inject(CkMedia).sheet()).toBe(true);
      const sheet = document.querySelector<HTMLElement>('.ck-overlay--sheet')!;
      expect(sheet.getAttribute('role')).toBe('dialog');
      expect(rect(sheet).width).toBe(390);
      expect(Math.round(rect(sheet).bottom)).toBe(844);
      items()[1].click();
      await settle(fixture);
      await wait(20);
      expect(menu()).toBeNull();
    });
  });

  describe('lifecycle', () => {
    it('closes its overlay and stops listening when the trigger is destroyed while open', async () => {
      const { fixture, host } = await open(
        `@if (!locked()) {${ROW_MENU()}}`,
        undefined,
        undefined,
        false,
      );
      const removed = vi.spyOn(document, 'removeEventListener');
      expect(menu()).not.toBeNull();
      host.locked.set(true);
      await settle(fixture);
      await wait(20);
      expect(menu()).toBeNull();
      expect(overlayPanels()).toEqual([]);
      expect(removed.mock.calls.some((call) => call[0] === 'keydown')).toBe(true);
    });
  });

  describe('accessibility', () => {
    it.each([
      ['light', MENU_LIGHT, 'white', 'rgb(20, 20, 30)'],
      ['dark', MENU_DARK, 'rgb(30, 30, 36)', 'rgb(245, 245, 250)'],
    ] as const)(
      'has no axe violations in %s: closed, popover, sheet',
      async (_name, tokens, background, color) => {
        const wrap = (inner: string) =>
          `<div style="background: ${background}; color: ${color}">${inner}</div>`;
        const first = mount(wrap(ROW_MENU()), undefined, undefined, tokens);
        await settle(first.fixture);
        await expectNoAxeViolations(first.root);
        trigger(first.root).focus();
        await userEvent.keyboard('{Enter}');
        await settle(first.fixture);
        const container = () => document.querySelector('.cdk-overlay-container')!;
        await expectNoAxeViolations(container());
        await expectNoAxeViolations(first.root);
        await userEvent.keyboard('{Escape}');
        await settle(first.fixture);

        cleanUp();
        fakeMedia(true);
        const second = mount(wrap(ROW_MENU()), undefined, undefined, tokens);
        await settle(second.fixture);
        trigger(second.root).click();
        await settle(second.fixture);
        await expectNoAxeViolations(container());
      },
    );
  });
});
