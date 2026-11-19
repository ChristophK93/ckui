import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { contrastRatio } from '../testing/contrast';
import {
  DIALOG_DARK,
  DIALOG_LIGHT,
  drawerPanel,
  fakeMedia,
  press,
  resetEnvironment,
  settle,
  setup,
  wait,
} from '../testing/drawer-env';
import { CK_DRAWER_IMPORTS, CkDrawer, CkDrawerConfig } from './index';

@Component({
  selector: 'ck-test-short',
  imports: [CK_DRAWER_IMPORTS],
  template: `
    <h2 ckDialogTitle>Devices</h2>
    <p ckDialogDescription>Bike and treadmill.</p>
    <ck-dialog-actions>
      <button type="button" class="cancel" ckDialogClose>Cancel</button>
      <button type="button" class="save" ckDialogClose="saved">Save</button>
    </ck-dialog-actions>
  `,
})
class Short {}

@Component({
  selector: 'ck-test-tall',
  imports: [CK_DRAWER_IMPORTS],
  template: `
    <h2 ckDialogTitle>Calibration</h2>
    <ck-dialog-body>
      <div class="tall" style="block-size: 3000px">A very tall form</div>
    </ck-dialog-body>
    <ck-dialog-actions>
      <button type="button" class="apply" ckDialogClose="yes">Apply</button>
    </ck-dialog-actions>
  `,
})
class Tall {}

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

const rect = (element: Element) => element.getBoundingClientRect();
const style = (element: Element) => getComputedStyle(element);

describe('CkDrawer layout', () => {
  beforeEach(async () => {
    document.body.insertAdjacentHTML('afterbegin', '<main id="app"><button>Page</button></main>');
    setup();
    await page.viewport(1280, 800);
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await wait(0);
    resetEnvironment();
    await emulate([]);
    await page.viewport(800, 600);
  });

  async function open(
    content: Parameters<CkDrawer['open']>[0] = Short,
    config: CkDrawerConfig = {},
  ): Promise<HTMLElement> {
    TestBed.inject(CkDrawer).open(content, { mode: 'side', ...config });
    await settle();
    await wait(0);
    return drawerPanel()!;
  }

  const inPanel = <T extends HTMLElement>(selector: string): T =>
    drawerPanel()!.querySelector<T>(selector)!;

  describe('side panel', () => {
    it('fills the height against the end edge, with the three widths', async () => {
      const widths = { sm: 320, md: 384, lg: 512 } as const;
      for (const [width, expected] of Object.entries(widths)) {
        const element = await open(Short, { width: width as keyof typeof widths });
        const box = rect(element);
        expect(Math.round(box.width), width).toBe(expected);
        expect(Math.round(box.top)).toBe(0);
        expect(Math.round(box.height)).toBe(800);
        expect(Math.round(box.right)).toBe(1280);
        TestBed.inject(CkDrawer).closeAll();
        await settle();
      }
    });

    it('sits against the start edge, and against the opposite one in a right-to-left page', async () => {
      const left = await open(Short, { side: 'start' });
      expect(Math.round(rect(left).left)).toBe(0);
      TestBed.inject(CkDrawer).closeAll();
      await settle();

      TestBed.inject(OverlayContainer).getContainerElement().setAttribute('dir', 'rtl');
      const right = await open(Short, { side: 'start' });
      expect(Math.round(rect(right).right)).toBe(1280);
      TestBed.inject(CkDrawer).closeAll();
      await settle();
      const end = await open(Short, { side: 'end' });
      expect(Math.round(rect(end).left)).toBe(0);
    });

    it('mirrors the content too when <html dir> turns right-to-left at runtime', async () => {
      document.documentElement.setAttribute('dir', 'rtl');
      const element = await open(Short, { side: 'end' });
      const box = rect(element);
      expect(Math.round(box.left)).toBe(0);
      expect(element.parentElement!.getAttribute('dir')).toBe('rtl');
      expect(rect(inPanel('.ck-dialog__close')).left - box.left).toBeLessThan(48);
      expect(box.right - rect(inPanel('.ck-dialog__close')).right).toBeGreaterThan(200);
    });

    it('is capped at the viewport minus a margin on a narrow screen', async () => {
      await page.viewport(390, 800);
      const element = await open(Short, { width: 'lg' });
      expect(Math.round(rect(element).width)).toBe(390 - 16);
      expect(Math.round(rect(element).right)).toBe(390);
    });

    it('takes --ck-drawer-width over the named width, and no dialog token', async () => {
      document.documentElement.style.setProperty('--ck-drawer-width', '30rem');
      document.documentElement.style.setProperty('--ck-dialog-max-width', '10rem');
      document.documentElement.style.setProperty('--ck-dialog-bg', 'rgb(1, 2, 3)');
      const element = await open(Short, { width: 'sm' });
      expect(Math.round(rect(element).width)).toBe(480);
      expect(style(element).backgroundColor).not.toBe('rgb(1, 2, 3)');
    });

    it('reads bg, shadow and padding from the drawer tokens, with fallbacks from the semantic ones', async () => {
      const element = await open();
      expect(style(element).backgroundColor).toBe(DIALOG_LIGHT['--ck-color-surface-raised']);
      expect(style(element).boxShadow).toContain('rgba(0, 0, 0, 0.16)');
      expect(style(inPanel('.ck-dialog')).paddingLeft).toBe('24px');
      expect(style(element).borderTopLeftRadius).toBe('0px');
      TestBed.inject(CkDrawer).closeAll();
      await settle();

      document.documentElement.style.setProperty('--ck-drawer-bg', 'rgb(10, 20, 30)');
      document.documentElement.style.setProperty('--ck-drawer-shadow', 'none');
      document.documentElement.style.setProperty('--ck-drawer-padding', '10px');
      const themed = await open();
      expect(style(themed).backgroundColor).toBe('rgb(10, 20, 30)');
      expect(style(themed).boxShadow).toBe('none');
      expect(style(inPanel('.ck-dialog')).paddingLeft).toBe('10px');
      expect(style(inPanel('.ck-dialog')).paddingTop).toBe('10px');
    });

    it('scrolls the body inside a full-height panel and keeps the actions in view', async () => {
      await open(Tall);
      const body = inPanel('.ck-dialog-body');
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight * 2);
      expect(style(body).overflowY).toBe('auto');
      expect(rect(inPanel('.apply')).bottom).toBeLessThanOrEqual(800);
      expect(rect(drawerPanel()!).height).toBeLessThanOrEqual(800);
      expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(800);
    });

    it('keeps the actions at the bottom of a short drawer and the close button at the top', async () => {
      await open();
      expect(800 - rect(inPanel('.cancel')).bottom).toBeLessThan(40);
      expect(rect(inPanel('.ck-dialog__close')).top).toBeLessThan(40);
    });

    it('is the topmost element over its own area, and the backdrop is outside it', async () => {
      const element = await open();
      const box = rect(element);
      const inside = document.elementFromPoint(box.left + box.width / 2, box.top + 100);
      expect(element.contains(inside)).toBe(true);
      const outside = document.elementFromPoint(20, 400);
      expect(outside?.classList.contains('ck-overlay-backdrop')).toBe(true);
    });

    it('closes with Escape and returns focus to the page', async () => {
      document.querySelector<HTMLElement>('#app button')!.focus();
      await open();
      await userEvent.keyboard('{Escape}');
      await settle();
      await wait(20);
      expect(drawerPanel()).toBeNull();
      expect(document.activeElement).toBe(document.querySelector('#app button'));
    });

    it('keeps its content out of a display cut-out on its own edge and at the top and bottom', async () => {
      await open();
      const css = Array.from(document.querySelectorAll('style'))
        .map((element) => element.textContent)
        .join('\n');
      for (const inset of ['top', 'bottom', 'right', 'left']) {
        expect(css).toContain(`safe-area-inset-${inset}`);
      }
      expect(css).toMatch(/\.ck-overlay--right\s*\{\s*padding-right:\s*env\(safe-area-inset-right/);
      expect(css).toMatch(/\.ck-overlay--left\s*\{\s*padding-left:\s*env\(safe-area-inset-left/);
    });
  });

  describe('sheet', () => {
    it('looks like the dialog sheet: bottom, full width, round at the top, grab area in the surface', async () => {
      const element = await open(Short, { mode: 'sheet' });
      const box = rect(element);
      expect(Math.round(box.bottom)).toBe(800);
      expect(Math.round(box.width)).toBe(1280);
      expect(box.height).toBeLessThan(400);
      expect(style(element).borderTopLeftRadius).toBe('16px');
      expect(style(element).borderBottomLeftRadius).toBe('0px');
      const grab = inPanel('.ck-overlay-grab');
      expect(style(grab).backgroundColor).toBe(style(element).backgroundColor);
      expect(style(inPanel('.ck-dialog')).paddingLeft).toBe('16px');
      expect(style(inPanel('.ck-dialog')).paddingTop).toBe('0px');
    });

    it('takes the drawer tokens as well, grab area included', async () => {
      document.documentElement.style.setProperty('--ck-drawer-bg', 'rgb(10, 20, 30)');
      document.documentElement.style.setProperty('--ck-drawer-padding', '12px');
      const element = await open(Short, { mode: 'sheet' });
      expect(style(element).backgroundColor).toBe('rgb(10, 20, 30)');
      expect(style(inPanel('.ck-overlay-grab')).backgroundColor).toBe('rgb(10, 20, 30)');
      expect(style(inPanel('.ck-dialog')).paddingLeft).toBe('12px');
    });

    it('stacks the actions and fills the screen height with fullHeight', async () => {
      const element = await open(Tall, { mode: 'sheet', fullHeight: true });
      expect(Math.round(rect(element).height)).toBe(800);
      expect(style(inPanel('.ck-dialog-actions')).flexDirection).toBe('column');
    });
  });

  describe('mode auto against the real viewport', () => {
    it('stays a side panel on a narrow window without a coarse pointer', async () => {
      await page.viewport(390, 800);
      TestBed.inject(CkDrawer).open(Short);
      await settle();
      expect(drawerPanel()!.classList.contains('ck-overlay--side')).toBe(true);
      expect(rect(drawerPanel()!).left).toBeGreaterThanOrEqual(0);
      expect(rect(drawerPanel()!).right).toBeLessThanOrEqual(390);
    });

    it('becomes a sheet when CkMedia says so', async () => {
      TestBed.resetTestingModule();
      setup();
      fakeMedia({ sheet: true });
      await page.viewport(390, 800);
      TestBed.inject(CkDrawer).open(Short);
      await settle();
      expect(drawerPanel()!.classList.contains('ck-overlay--sheet')).toBe(true);
      expect(Math.round(rect(drawerPanel()!).width)).toBe(390);
    });
  });

  describe('themes and preferences', () => {
    it('keeps the text 4.5:1 on the surface in light and dark', async () => {
      for (const tokens of [DIALOG_LIGHT, DIALOG_DARK]) {
        setup(tokens);
        const element = await open();
        const surface = style(element).backgroundColor;
        expect(style(element).colorScheme).toBe(tokens['--ck-color-scheme']);
        expect(contrastRatio(style(inPanel('h2')).color, surface)).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(style(inPanel('.ck-dialog__description')).color, surface),
        ).toBeGreaterThanOrEqual(4.5);
        TestBed.inject(CkDrawer).closeAll();
        await settle();
        TestBed.resetTestingModule();
      }
    });

    it('has no axe violations as a side panel and as a sheet, in light and dark', async () => {
      for (const tokens of [DIALOG_LIGHT, DIALOG_DARK]) {
        for (const mode of ['side', 'sheet'] as const) {
          setup(tokens);
          await open(Tall, { mode });
          await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
          TestBed.inject(CkDrawer).closeAll();
          await settle();
          TestBed.resetTestingModule();
        }
      }
    });

    it('draws a border around the panel in forced-colors mode, as a side panel and as a sheet', async () => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      for (const mode of ['side', 'sheet'] as const) {
        const element = await open(Short, { mode });
        expect(style(element).borderTopWidth, mode).toBe('1px');
        expect(style(element).borderTopStyle, mode).toBe('solid');
        expect(style(element).borderTopColor, mode).toBe(style(inPanel('h2')).color);
        TestBed.inject(CkDrawer).closeAll();
        await settle();
      }
    });

    it('slides with an animation, and without one under reduced motion', async () => {
      document.documentElement.style.setProperty('--ck-duration-normal', '400ms');
      TestBed.inject(CkDrawer).open(Short, { mode: 'side' });
      await wait(30);
      const slide = drawerPanel()!.getAnimations();
      expect(slide.length).toBeGreaterThan(0);
      expect((slide[0].effect as KeyframeEffect).getTiming().duration).toBe(400);
      TestBed.inject(CkDrawer).closeAll();
      await settle();
      TestBed.resetTestingModule();

      setup();
      document.documentElement.style.setProperty('--ck-duration-normal', '400ms');
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const ref = TestBed.inject(CkDrawer).open(Short, { mode: 'side' });
      await wait(30);
      expect(drawerPanel()!.getAnimations()).toHaveLength(0);
      expect(document.querySelector('.ck-overlay-backdrop')!.getAnimations()).toHaveLength(0);
      press('Escape');
      const started = performance.now();
      await ref.closed;
      expect(performance.now() - started).toBeLessThan(150);
      expect(drawerPanel()).toBeNull();
    });
  });
});
