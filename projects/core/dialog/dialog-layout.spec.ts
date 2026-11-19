import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CkMedia } from '@ckui/core/internal';
import { vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { contrastRatio } from '../testing/contrast';
import {
  DIALOG_DARK,
  DIALOG_LIGHT,
  panel,
  panels,
  resetEnvironment,
  settle,
  setup,
  wait,
} from '../testing/dialog-env';
import { CK_DIALOG_IMPORTS, CkDialog, CkDialogConfig } from './index';

@Component({
  selector: 'ck-test-short',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>Delete the workout?</h2>
    <p ckDialogDescription>It cannot be undone.</p>
    <ck-dialog-actions>
      <button type="button" class="cancel" ckDialogClose>Cancel</button>
      <button type="button" class="confirm" ckDialogClose="yes">Delete</button>
    </ck-dialog-actions>
  `,
})
class Short {}

@Component({
  selector: 'ck-test-tall',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>Terms of use</h2>
    <ck-dialog-body>
      <div class="tall" style="block-size: 3000px">A very tall text</div>
    </ck-dialog-body>
    <ck-dialog-actions>
      <button type="button" class="accept" ckDialogClose="yes">Accept</button>
    </ck-dialog-actions>
  `,
})
class Tall {}

@Component({
  selector: 'ck-test-inline-title',
  imports: [CK_DIALOG_IMPORTS],
  template: `<h2 ckDialogTitle>Delete <em>Leg day</em> now</h2>`,
})
class InlineTitle {}

@Component({
  selector: 'ck-test-untitled',
  imports: [CK_DIALOG_IMPORTS],
  template: `<ck-dialog-body class="untitled">Just a sentence of help text.</ck-dialog-body>`,
})
class Untitled {}

@Component({
  selector: 'ck-test-wrapped',
  imports: [CK_DIALOG_IMPORTS],
  template: `
    <h2 ckDialogTitle>A wrapper component</h2>
    <ck-dialog-body><div style="block-size: 2000px">Tall</div></ck-dialog-body>
    <ck-dialog-actions
      ><button type="button" class="ok" ckDialogClose>Ok</button></ck-dialog-actions
    >
  `,
})
class Wrapped {}

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

const rect = (element: Element) => element.getBoundingClientRect();
/** The box of the text itself, without the element's padding. */
const textRect = (element: Element): DOMRect => {
  const range = document.createRange();
  range.selectNodeContents(element);
  return range.getBoundingClientRect();
};

describe('CkDialog layout', () => {
  beforeEach(async () => {
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
    content: Parameters<CkDialog['open']>[0] = Short,
    config: CkDialogConfig = {},
  ): Promise<HTMLElement> {
    TestBed.inject(CkDialog).open(content, { mode: 'modal', ...config });
    await settle();
    await wait(0);
    return panel()!;
  }

  const style = (element: Element) => getComputedStyle(element);
  const inPanel = <T extends HTMLElement>(selector: string): T =>
    panel()!.querySelector<T>(selector)!;

  describe('modal', () => {
    it('centres the panel and sizes it 24, 32 and 48rem for sm, md and lg', async () => {
      const widths: number[] = [];
      for (const width of ['sm', 'md', 'lg'] as const) {
        const element = await open(Short, { width });
        widths.push(Math.round(rect(element).width));
        const box = rect(element);
        expect(Math.abs(box.left + box.width / 2 - 640)).toBeLessThan(2);
        expect(Math.abs(box.top + box.height / 2 - 400)).toBeLessThan(2);
        TestBed.inject(CkDialog).closeAll();
        await settle();
      }
      expect(widths).toEqual([384, 512, 768]);
    });

    it('lets --ck-dialog-max-width override the width, and never exceeds the screen', async () => {
      document.documentElement.style.setProperty('--ck-dialog-max-width', '20rem');
      const element = await open(Short, { width: 'lg' });
      expect(Math.round(rect(element).width)).toBe(320);
      TestBed.inject(CkDialog).closeAll();
      await settle();
      await page.viewport(300, 700);
      document.documentElement.style.setProperty('--ck-dialog-max-width', '90rem');
      const narrow = await open(Short);
      expect(rect(narrow).left).toBeGreaterThanOrEqual(0);
      expect(rect(narrow).right).toBeLessThanOrEqual(300);
    });

    it('paints the raised surface with the radius, padding and shadow from the tokens', async () => {
      const element = await open();
      expect(style(element).backgroundColor).toBe('rgb(255, 255, 255)');
      expect(style(element).borderTopLeftRadius).toBe('16px');
      expect(style(element).borderBottomRightRadius).toBe('16px');
      expect(style(element).boxShadow).not.toBe('none');
      expect(style(element).colorScheme).toBe('light');
      expect(style(inPanel('.ck-dialog')).paddingTop).toBe('24px');
      expect(style(inPanel('.ck-dialog')).paddingLeft).toBe('24px');
    });

    it('reads the component tokens with fallbacks and obeys them', async () => {
      const root = document.documentElement.style;
      root.setProperty('--ck-dialog-bg', 'rgb(10, 20, 30)');
      root.setProperty('--ck-dialog-radius', '4px');
      root.setProperty('--ck-dialog-padding', '10px');
      root.setProperty('--ck-dialog-shadow', 'none');
      const element = await open();
      expect(style(element).backgroundColor).toBe('rgb(10, 20, 30)');
      expect(style(element).borderTopLeftRadius).toBe('4px');
      expect(style(element).boxShadow).toBe('none');
      expect(style(inPanel('.ck-dialog')).paddingTop).toBe('10px');
    });

    it('puts the close button at the inline end of the title row', async () => {
      const element = await open();
      const close = rect(inPanel('.ck-dialog__close'));
      const title = inPanel('h2');
      expect(Math.abs(rect(element).right - 24 - close.right)).toBeLessThan(1.5);
      expect(Math.abs(rect(element).top + 24 - close.top)).toBeLessThan(1.5);
      expect(textRect(title).right).toBeLessThanOrEqual(close.left);
      expect(rect(title).height).toBeGreaterThanOrEqual(40);
    });

    it('mirrors the close button and the title padding in RTL', async () => {
      // The overlay reads the direction once, when the first overlay is created.
      TestBed.resetTestingModule();
      setup();
      document.documentElement.setAttribute('dir', 'rtl');
      const rtl = await open();
      const rtlClose = rect(inPanel('.ck-dialog__close'));
      expect(Math.abs(rect(rtl).left + 24 - rtlClose.left)).toBeLessThan(1.5);
      expect(textRect(inPanel('h2')).left).toBeGreaterThanOrEqual(rtlClose.right);
    });

    it('keeps the spaces around inline markup in the title', async () => {
      await open(InlineTitle);
      const title = inPanel('h2');
      expect(style(title).display).not.toBe('flex');
      expect(title.textContent).toBe('Delete Leg day now');
      expect(title.innerText).toBe('Delete Leg day now');
      const [words, strong] = [textRect(title), textRect(inPanel('h2 em'))];
      const before = document.createRange();
      before.setStart(title.firstChild!, 0);
      before.setEnd(title.firstChild!, 'Delete'.length);
      const lead = before.getBoundingClientRect();
      expect(strong.left - lead.right).toBeGreaterThan(2);
      expect(words.height).toBeLessThan(40);
    });

    it('keeps the first line of an untitled dialog below the close button', async () => {
      await open(Untitled, { ariaLabel: 'Help' });
      expect(textRect(inPanel('.untitled')).top).toBeGreaterThanOrEqual(
        rect(inPanel('.ck-dialog__close')).bottom - 1,
      );
    });

    it('takes no room for a close button that is not there', async () => {
      await open(Untitled, { ariaLabel: 'Help', closeButton: false });
      expect(Math.round(rect(inPanel('.untitled')).top - rect(panel()!).top)).toBe(24 - 8);
    });

    it('lines the actions up at the inline end', async () => {
      await open();
      const actions = rect(inPanel('.ck-dialog-actions'));
      const confirm = rect(inPanel('.confirm'));
      expect(Math.abs(actions.right - confirm.right)).toBeLessThan(1.5);
      expect(rect(inPanel('.cancel')).right).toBeLessThanOrEqual(confirm.left);
    });

    it('scrolls only the body when the content is taller than the screen, with title and actions visible', async () => {
      await page.viewport(1280, 500);
      const element = await open(Tall);
      const body = inPanel('.ck-dialog-body');
      expect(rect(element).height).toBeLessThanOrEqual(500 - 32 + 1);
      expect(rect(element).top).toBeGreaterThanOrEqual(0);
      expect(rect(element).bottom).toBeLessThanOrEqual(500);
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight + 100);
      expect(style(body).overflowY).toBe('auto');
      expect(style(element).overflowY).toBe('visible');
      const title = inPanel('h2');
      const accept = inPanel('.accept');
      const before = [rect(title).top, rect(accept).top];
      body.scrollTop = 99999;
      await wait(20);
      expect(body.scrollTop).toBeGreaterThan(1000);
      expect([rect(title).top, rect(accept).top]).toEqual(before);
      expect(rect(title).top).toBeGreaterThanOrEqual(rect(element).top);
      expect(rect(accept).bottom).toBeLessThanOrEqual(rect(element).bottom);
      expect(rect(accept).bottom).toBeLessThanOrEqual(500);
      expect(inPanel('.ck-dialog-body').getAttribute('tabindex')).toBe('0');
    });

    it('gives a body that does not scroll no tab stop, and takes it away again when it shrinks', async () => {
      await open(Short);
      expect(panel()!.querySelector('.ck-dialog-body')).toBeNull();
      TestBed.inject(CkDialog).closeAll();
      await settle();
      await page.viewport(1280, 500);
      await open(Tall);
      const body = inPanel('.ck-dialog-body');
      expect(body.getAttribute('tabindex')).toBe('0');
      inPanel<HTMLElement>('.tall').style.cssText = 'block-size: 10px; overflow: hidden';
      await vi.waitFor(() => expect(body.hasAttribute('tabindex')).toBe(false));
    });

    it('lays a component dialog out like a template: its host is a flex column that lets the body scroll', async () => {
      await page.viewport(1280, 400);
      const element = await open(Wrapped);
      const host = inPanel('ck-test-wrapped');
      expect(host.classList.contains('ck-dialog__component')).toBe(true);
      expect(style(host).display).toBe('flex');
      const body = inPanel('.ck-dialog-body');
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
      expect(rect(inPanel('.ok')).bottom).toBeLessThanOrEqual(rect(element).bottom);
    });
  });

  describe('sheet', () => {
    beforeEach(async () => {
      await page.viewport(390, 844);
    });

    it('sits at the bottom, full width, as tall as its content, with only the top corners round', async () => {
      const element = await open(Short, { mode: 'sheet' });
      const box = rect(element);
      expect(Math.round(box.width)).toBe(390);
      expect(Math.round(box.bottom)).toBe(844);
      expect(box.height).toBeLessThan(400);
      expect(style(element).borderTopLeftRadius).toBe('16px');
      expect(style(element).borderTopRightRadius).toBe('16px');
      expect(style(element).borderBottomLeftRadius).toBe('0px');
      expect(style(element).borderBottomRightRadius).toBe('0px');
    });

    it('uses the smaller padding, and adds the safe-area inset to the bottom one', async () => {
      await open(Short, { mode: 'sheet' });
      const container = inPanel('.ck-dialog');
      expect(style(container).paddingLeft).toBe('16px');
      expect(style(container).paddingBottom).toBe('16px');
      expect(style(container).paddingTop).toBe('0px');
      const rules = Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .flatMap((rule) =>
          'cssRules' in rule ? Array.from((rule as CSSGroupingRule).cssRules) : [rule],
        )
        .map((rule) => rule.cssText);
      expect(
        rules.some(
          (text) =>
            text.includes('.ck-dialog--sheet') &&
            text.includes('padding-block-end') &&
            text.includes('env(safe-area-inset-bottom'),
        ),
      ).toBe(true);
    });

    it('keeps the top padding without the grab area when the sheet is not dismissible', async () => {
      await open(Short, { mode: 'sheet', dismissible: false });
      expect(panel()!.querySelector('.ck-overlay-grab')).toBeNull();
      expect(style(inPanel('.ck-dialog')).paddingTop).toBe('16px');
    });

    it('draws the grab area as the same surface as the dialog, with the dialog radius', async () => {
      document.documentElement.style.setProperty('--ck-dialog-bg', 'rgb(10, 20, 30)');
      document.documentElement.style.setProperty('--ck-dialog-radius', '20px');
      const element = await open(Short, { mode: 'sheet' });
      const grab = inPanel('.ck-overlay-grab');
      expect(style(grab).backgroundColor).toBe('rgb(10, 20, 30)');
      expect(style(grab).backgroundColor).toBe(style(element).backgroundColor);
      expect(style(grab).borderTopLeftRadius).toBe('20px');
      expect(style(element).borderTopLeftRadius).toBe('20px');
      expect(rect(grab).top).toBe(rect(element).top);
      expect(rect(inPanel('h2')).top).toBeGreaterThanOrEqual(rect(grab).bottom);
    });

    it('stacks the actions at full width, in reading order', async () => {
      await open(Short, { mode: 'sheet' });
      const actions = rect(inPanel('.ck-dialog-actions'));
      const cancel = rect(inPanel('.cancel'));
      const confirm = rect(inPanel('.confirm'));
      expect(Math.round(cancel.width)).toBe(Math.round(actions.width));
      expect(Math.round(confirm.width)).toBe(Math.round(actions.width));
      expect(confirm.top).toBeGreaterThanOrEqual(cancel.bottom);
    });

    it('is as tall as the screen allows with fullHeight, and the actions stay at the bottom', async () => {
      const content = await open(Short, { mode: 'sheet' });
      const shortHeight = rect(content).height;
      TestBed.inject(CkDialog).closeAll();
      await settle();
      const element = await open(Short, { mode: 'sheet', fullHeight: true });
      expect(Math.round(rect(element).height)).toBe(844);
      expect(rect(element).height).toBeGreaterThan(shortHeight + 200);
      expect(Math.round(rect(element).top)).toBe(0);
      const actions = rect(inPanel('.ck-dialog-actions'));
      expect(actions.bottom).toBeGreaterThan(844 - 40);
      expect(actions.bottom).toBeLessThanOrEqual(844);
    });

    it('caps tall content at the screen, scrolls only the body and keeps the actions on screen', async () => {
      const element = await open(Tall, { mode: 'sheet' });
      expect(Math.round(rect(element).height)).toBe(844);
      const body = inPanel('.ck-dialog-body');
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
      body.scrollTop = 99999;
      await wait(20);
      expect(rect(inPanel('.accept')).bottom).toBeLessThanOrEqual(844);
      expect(rect(inPanel('h2')).top).toBeGreaterThanOrEqual(0);
    });

    it('snaps back after a short slow swipe on the grab area, and closes after a short fast flick', async () => {
      const ref = TestBed.inject(CkDialog).open(Short, { mode: 'sheet' });
      await settle();
      const grab = inPanel('.ck-overlay-grab');
      const height = rect(panel()!).height;
      vi.spyOn(HTMLElement.prototype, 'setPointerCapture').mockImplementation(() => undefined);
      const send = (type: string, target: EventTarget, clientY: number): void => {
        target.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 3,
            isPrimary: true,
            button: 0,
            clientX: 100,
            clientY,
            bubbles: true,
            cancelable: true,
          }),
        );
      };
      vi.useFakeTimers({ toFake: ['performance'] });
      send('pointerdown', grab, 100);
      vi.advanceTimersByTime(500);
      send('pointermove', document, 100 + height * 0.2);
      vi.advanceTimersByTime(500);
      send('pointerup', document, 100 + height * 0.2);
      vi.useRealTimers();
      await wait(100);
      expect(panels()).toHaveLength(1);
      expect(panel()!.style.transform).toBe('');

      // A flick: well under a third of the height, but fast.
      vi.useFakeTimers({ toFake: ['performance'] });
      send('pointerdown', grab, 100);
      vi.advanceTimersByTime(10);
      send('pointermove', document, 100 + height * 0.2);
      vi.advanceTimersByTime(10);
      send('pointerup', document, 100 + height * 0.25);
      vi.useRealTimers();
      await expect(ref.closed).resolves.toBeUndefined();
      expect(panels()).toHaveLength(0);
    });

    it('does not swipe when not dismissible', async () => {
      TestBed.inject(CkDialog).open(Short, { mode: 'sheet', dismissible: false });
      await settle();
      expect(panel()!.querySelector('[data-ck-sheet-grab]')).toBeNull();
    });

    it('has no axe violations as a sheet in the light theme', async () => {
      await open(Short, { mode: 'sheet' });
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });

    it('has no axe violations as a scrolling sheet in the dark theme', async () => {
      TestBed.resetTestingModule();
      setup(DIALOG_DARK);
      await open(Tall, { mode: 'sheet' });
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });
  });

  describe('mode auto against the real viewport', () => {
    it('stays a centred modal on a narrow window without a coarse pointer', async () => {
      await page.viewport(390, 800);
      const media = TestBed.inject(CkMedia);
      expect(media.narrow()).toBe(true);
      expect(media.coarsePointer()).toBe(false);
      TestBed.inject(CkDialog).open(Short);
      await settle();
      expect(panel()!.classList.contains('ck-overlay--modal')).toBe(true);
      expect(rect(panel()!).bottom).toBeLessThan(800);
      expect(rect(panel()!).left).toBeGreaterThanOrEqual(0);
      expect(rect(panel()!).right).toBeLessThanOrEqual(390);
    });

    it('becomes a sheet when CkMedia says so, decided at the moment of opening', async () => {
      const sheet = signal(true);
      TestBed.resetTestingModule();
      setup();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: CkMedia,
            useValue: {
              sheet,
              reducedMotion: signal(false),
              narrow: signal(true),
              coarsePointer: signal(true),
            },
          },
        ],
      });
      await page.viewport(390, 800);
      const dialog = TestBed.inject(CkDialog);
      dialog.open(Short);
      sheet.set(false);
      dialog.open(Short);
      await settle();
      expect(panels()[0].classList.contains('ck-overlay--sheet')).toBe(true);
      expect(panels()[1].classList.contains('ck-overlay--modal')).toBe(true);
      expect(panels()[0].querySelector('.ck-dialog--sheet')).not.toBeNull();
      expect(panels()[1].querySelector('.ck-dialog--sheet')).toBeNull();
    });
  });

  describe('themes and preferences', () => {
    it('keeps the text 4.5:1 on the surface in light and dark', async () => {
      for (const tokens of [DIALOG_LIGHT, DIALOG_DARK]) {
        setup(tokens);
        const element = await open();
        const surface = style(element).backgroundColor;
        expect(contrastRatio(style(inPanel('h2')).color, surface)).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(style(inPanel('.ck-dialog__description')).color, surface),
        ).toBeGreaterThanOrEqual(4.5);
        TestBed.inject(CkDialog).closeAll();
        await settle();
        TestBed.resetTestingModule();
      }
    });

    it('has no axe violations as a modal in the dark theme', async () => {
      setup(DIALOG_DARK);
      await open();
      expect(style(panel()!).colorScheme).toBe('dark');
      await expectNoAxeViolations(document.querySelector('.cdk-overlay-container')!);
    });

    it('draws a border around the panel in forced-colors mode', async () => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const element = await open();
      expect(style(element).borderTopWidth).toBe('1px');
      expect(style(element).borderTopStyle).toBe('solid');
    });

    it('opens without an animation under reduced motion, and with one otherwise', async () => {
      document.documentElement.style.setProperty('--ck-duration-normal', '400ms');
      TestBed.inject(CkDialog).open(Short, { mode: 'modal' });
      await wait(30);
      expect(panel()!.getAnimations().length).toBeGreaterThan(0);
      TestBed.inject(CkDialog).closeAll();
      await settle();
      TestBed.resetTestingModule();

      setup();
      document.documentElement.style.setProperty('--ck-duration-normal', '400ms');
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      TestBed.inject(CkDialog).open(Short, { mode: 'modal' });
      await wait(30);
      expect(panel()!.getAnimations()).toHaveLength(0);
    });

    it('is not covered by the page: the dialog is the topmost element at its centre', async () => {
      const element = await open();
      const box = rect(element);
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      expect(element.contains(hit)).toBe(true);
      await userEvent.keyboard('{Escape}');
      await settle();
    });
  });
});
