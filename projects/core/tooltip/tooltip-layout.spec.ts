import { By } from '@angular/platform-browser';
import { CkTooltip } from '@ckui/core/tooltip';
import { afterEach, describe, expect, it } from 'vitest';
import { cdp, page } from 'vitest/browser';
import { expectNoAxeViolations } from '../testing/axe';
import { contrastRatio } from '../testing/contrast';
import {
  TOOLTIP_DARK,
  TOOLTIP_LIGHT,
  bubbles,
  cleanUp,
  layer,
  mount,
  settle,
  shown,
  wait,
} from '../testing/tooltip-host';

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

const LONG =
  'Starts the rest timer after every finished set and shows how long is left until the next one';

/** A button fixed in the viewport, so the tests control exactly how much room each side has. */
const FIXED = (style: string, attributes = '', text = 'Starts after each set') =>
  `<button ckButton aria-label="Rest timer" ckTooltip="${text}" ${attributes} style="position: fixed; ${style}">Rest</button>`;

/** Shows the only tooltip of the page and returns its bubble and its host. */
async function open(fixtureAndRoot: Awaited<ReturnType<typeof setup>>) {
  const { fixture, root } = fixtureAndRoot;
  fixture.debugElement.query(By.directive(CkTooltip)).injector.get(CkTooltip).show();
  await settle(fixture);
  const bubble = shown()[0];
  return { bubble, host: root.querySelector('button')!, fixture, root };
}

async function setup(template: string, tokens = TOOLTIP_LIGHT) {
  const mounted = mount(template, undefined, undefined, tokens);
  await settle(mounted.fixture);
  return mounted;
}

const rect = (element: Element) => element.getBoundingClientRect();

describe('CkTooltip layout', () => {
  afterEach(async () => {
    cleanUp();
    document.body.removeAttribute('dir');
    document.documentElement.removeAttribute('dir');
    await emulate([]);
    await page.viewport(800, 600);
    window.scrollTo(0, 0);
  });

  describe('placement', () => {
    it('sits above the host, centred on it, a token gap away', async () => {
      const { bubble, host } = await open(await setup(FIXED('left: 300px; top: 300px')));
      expect(bubble.classList.contains('ck-tooltip--above')).toBe(true);
      expect(rect(host).top - rect(bubble).bottom).toBe(4);
      expect(rect(bubble).left + rect(bubble).width / 2).toBeCloseTo(
        rect(host).left + rect(host).width / 2,
        0,
      );
    });

    it.each([
      ['below', 'ck-tooltip--below'],
      ['start', 'ck-tooltip--start'],
      ['end', 'ck-tooltip--end'],
    ] as const)(
      'puts the bubble on the %s side when there is room',
      async (position, className) => {
        const { bubble, host } = await open(
          await setup(FIXED('left: 300px; top: 300px', `ckTooltipPosition="${position}"`)),
        );
        expect(bubble.classList.contains(className)).toBe(true);
        const box = rect(bubble);
        const anchor = rect(host);
        if (position === 'below') {
          expect(box.top - anchor.bottom).toBe(4);
        } else if (position === 'start') {
          expect(anchor.left - box.right).toBe(4);
          expect(box.top + box.height / 2).toBeCloseTo(anchor.top + anchor.height / 2, 0);
        } else {
          expect(box.left - anchor.right).toBe(4);
        }
      },
    );

    it('flips below when there is no room above, and above when there is none below', async () => {
      const top = await open(await setup(FIXED('left: 300px; top: 4px')));
      expect(top.bubble.classList.contains('ck-tooltip--below')).toBe(true);
      expect(rect(top.bubble).top).toBeGreaterThanOrEqual(rect(top.host).bottom);
      top.fixture.destroy();
      cleanUp();
      const bottom = await open(
        await setup(FIXED('left: 300px; bottom: 4px', 'ckTooltipPosition="below"')),
      );
      expect(bottom.bubble.classList.contains('ck-tooltip--above')).toBe(true);
      expect(rect(bottom.bubble).bottom).toBeLessThanOrEqual(rect(bottom.host).top);
    });

    it('flips from start to end at the start edge, and from end to start at the end edge', async () => {
      const atStart = await open(
        await setup(FIXED('left: 4px; top: 300px', 'ckTooltipPosition="start"')),
      );
      expect(atStart.bubble.classList.contains('ck-tooltip--end')).toBe(true);
      expect(rect(atStart.bubble).left).toBeGreaterThanOrEqual(rect(atStart.host).right);
      atStart.fixture.destroy();
      cleanUp();
      const atEnd = await open(
        await setup(FIXED('right: 4px; top: 300px', 'ckTooltipPosition="end"')),
      );
      expect(atEnd.bubble.classList.contains('ck-tooltip--start')).toBe(true);
      expect(rect(atEnd.bubble).right).toBeLessThanOrEqual(rect(atEnd.host).left);
    });

    it('takes the side with more room when neither side fits', async () => {
      await page.viewport(390, 120);
      const { bubble, host } = await open(await setup(FIXED('left: 100px; top: 70px', '', LONG)));
      // 70px above, 10px below: the taller side wins even though the bubble does not fully fit.
      expect(bubble.classList.contains('ck-tooltip--above')).toBe(true);
      expect(rect(bubble).bottom).toBeLessThanOrEqual(rect(host).top);
    });

    it('shifts along the cross axis to stay a margin inside the viewport at 390px', async () => {
      await page.viewport(390, 844);
      const left = await open(await setup(FIXED('left: 0; top: 300px', '', LONG)));
      expect(rect(left.bubble).left).toBe(8);
      expect(rect(left.bubble).right).toBeLessThanOrEqual(390 - 8);
      left.fixture.destroy();
      cleanUp();
      const right = await open(await setup(FIXED('right: 0; top: 300px', '', LONG)));
      expect(rect(right.bubble).right).toBe(390 - 8);
      expect(rect(right.bubble).left).toBeGreaterThanOrEqual(8);
      right.fixture.destroy();
      cleanUp();
      const side = await open(
        await setup(FIXED('left: 100px; top: 0', 'ckTooltipPosition="end"', LONG)),
      );
      expect(rect(side.bubble).top).toBe(8);
    });

    it('reads the margin from --ck-space-2, set inline', async () => {
      await page.viewport(390, 844);
      const mounted = await setup(FIXED('left: 0; top: 300px', '', LONG));
      document.documentElement.style.setProperty('--ck-space-2', '20px');
      document.documentElement.style.setProperty('--ck-space-1', '10px');
      const { bubble, host } = await open(mounted);
      expect(rect(bubble).left).toBe(20);
      expect(rect(host).top - rect(bubble).bottom).toBe(10);
    });

    it('mirrors start and end in right-to-left text, and flips there too', async () => {
      const wrapper = (style: string, position: string) =>
        `<div dir="rtl">${FIXED(style, `ckTooltipPosition="${position}"`)}</div>`;
      const start = await open(await setup(wrapper('left: 300px; top: 300px', 'start')));
      expect(start.bubble.classList.contains('ck-tooltip--start')).toBe(true);
      expect(rect(start.bubble).left).toBeGreaterThanOrEqual(rect(start.host).right);
      start.fixture.destroy();
      cleanUp();
      const end = await open(await setup(wrapper('left: 300px; top: 300px', 'end')));
      expect(end.bubble.classList.contains('ck-tooltip--end')).toBe(true);
      expect(rect(end.bubble).right).toBeLessThanOrEqual(rect(end.host).left);
      end.fixture.destroy();
      cleanUp();
      // At the screen's right edge, `start` (the right in RTL) has no room and flips to the left.
      const edge = await open(await setup(wrapper('right: 4px; top: 300px', 'start')));
      expect(edge.bubble.classList.contains('ck-tooltip--end')).toBe(true);
      expect(rect(edge.bubble).right).toBeLessThanOrEqual(rect(edge.host).left);
    });

    it('fits RTL text at 390px without leaving the viewport', async () => {
      await page.viewport(390, 844);
      const { bubble } = await open(
        await setup(`<div dir="rtl">${FIXED('right: 0; top: 300px', '', LONG)}</div>`),
      );
      expect(rect(bubble).left).toBeGreaterThanOrEqual(8);
      expect(rect(bubble).right).toBeLessThanOrEqual(390 - 8);
      expect(getComputedStyle(bubble).direction).toBe('rtl');
    });

    it('does not make the page scroll sideways when it opens at the edge', async () => {
      await page.viewport(390, 844);
      const { bubble } = await open(await setup(FIXED('right: 0; top: 300px', '', LONG)));
      expect(bubble).toBeDefined();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    });
  });

  describe('size', () => {
    it('wraps at 20rem and never wider than the viewport minus a margin on each side', async () => {
      await page.viewport(390, 844);
      const wide = await open(await setup(FIXED('left: 100px; top: 300px', '', LONG)));
      expect(rect(wide.bubble).width).toBeLessThanOrEqual(320);
      expect(rect(wide.bubble).height).toBeGreaterThan(40);
      wide.fixture.destroy();
      cleanUp();
      await page.viewport(300, 600);
      const narrow = await open(await setup(FIXED('left: 100px; top: 300px', '', LONG)));
      expect(rect(narrow.bubble).width).toBeLessThanOrEqual(300 - 16);
    });

    it('reads its limit from --ck-tooltip-max-width, set inline', async () => {
      const mounted = await setup(FIXED('left: 300px; top: 300px', '', LONG));
      document.documentElement.style.setProperty('--ck-tooltip-max-width', '120px');
      const { bubble } = await open(mounted);
      expect(rect(bubble).width).toBeLessThanOrEqual(120);
    });

    it('wraps long text and one very long word instead of cutting it', async () => {
      const word = 'Supercalifragilisticexpialidocious'.repeat(3);
      const { bubble } = await open(await setup(FIXED('left: 300px; top: 300px', '', word)));
      const style = getComputedStyle(bubble);
      expect(style.textOverflow).toBe('clip');
      expect(style.whiteSpace).toBe('normal');
      expect(bubble.scrollWidth).toBeLessThanOrEqual(bubble.clientWidth);
      expect(bubble.scrollHeight).toBeLessThanOrEqual(bubble.clientHeight);
      expect(rect(bubble).width).toBeLessThanOrEqual(320);
    });

    it('has no box of its own in the layer, so it cannot become a flex or grid item of body', async () => {
      const mounted = await setup(FIXED('left: 300px; top: 300px'));
      expect(getComputedStyle(layer()!).display).toBe('contents');
      expect(mounted.fixture).toBeDefined();
    });

    it('reads radius and font size from their tokens, with the library fallback', async () => {
      const first = await open(await setup(FIXED('left: 300px; top: 300px')));
      expect(getComputedStyle(first.bubble).borderTopLeftRadius).toBe('4px');
      expect(getComputedStyle(first.bubble).fontSize).toBe('14px');
      first.fixture.destroy();
      cleanUp();
      const mounted = await setup(FIXED('left: 300px; top: 300px'));
      document.documentElement.style.setProperty('--ck-tooltip-radius', '12px');
      document.documentElement.style.setProperty('--ck-tooltip-font-size', '18px');
      const second = await open(mounted);
      expect(getComputedStyle(second.bubble).borderTopLeftRadius).toBe('12px');
      expect(getComputedStyle(second.bubble).fontSize).toBe('18px');
    });
  });

  describe('following the host', () => {
    it('moves with the host when a scroll container scrolls, and hides when the host is scrolled out of view', async () => {
      const { bubble, host, fixture } = await open(
        await setup(
          `<div id="scroller" style="position: fixed; left: 100px; top: 150px; width: 300px; height: 200px; overflow: auto">
             <div style="height: 80px"></div>
             <button ckButton aria-label="Rest timer" ckTooltip="Starts after each set" ckTooltipPosition="below">Rest</button>
             <div style="height: 900px"></div>
           </div>`,
        ),
      );
      const scroller = document.querySelector<HTMLElement>('#scroller')!;
      const before = rect(bubble).top;
      scroller.scrollTop = 20;
      await wait(60);
      expect(rect(bubble).top).toBeCloseTo(before - 20, 0);
      expect(rect(bubble).top - rect(host).bottom).toBe(4);
      scroller.scrollTop = 600;
      await wait(150);
      expect(shown()).toHaveLength(0);
      expect(bubbles()).toHaveLength(1);
      fixture.destroy();
    });

    it('moves with the host when the page scrolls', async () => {
      const mounted = await setup(
        `<div style="height: 1500px"></div>
           <button ckButton aria-label="Rest timer" ckTooltip="Starts after each set" ckTooltipPosition="below">Rest</button>
           <div style="height: 1500px"></div>`,
      );
      mounted.root.querySelector('button')!.scrollIntoView({ block: 'center' });
      const { bubble, host } = await open(mounted);
      const before = rect(bubble).top;
      window.scrollBy(0, 30);
      await wait(60);
      expect(rect(bubble).top).toBeCloseTo(before - 30, 0);
      expect(rect(bubble).top - rect(host).bottom).toBe(4);
    });

    it('hides when the page scrolls the host out of view', async () => {
      const { fixture } = await open(
        await setup(
          `<button ckButton aria-label="Rest timer" ckTooltip="Starts after each set" ckTooltipPosition="below">Rest</button>
           <div style="height: 3000px"></div>`,
        ),
      );
      window.scrollTo(0, 2000);
      await wait(150);
      expect(shown()).toHaveLength(0);
      fixture.destroy();
    });

    it('stays inside the viewport when the window shrinks while it is open', async () => {
      const { bubble } = await open(await setup(FIXED('right: 20px; top: 300px', '', LONG)));
      await page.viewport(390, 844);
      await wait(60);
      expect(rect(bubble).right).toBeLessThanOrEqual(390 - 8);
      expect(rect(bubble).left).toBeGreaterThanOrEqual(8);
    });
  });

  describe('look', () => {
    it.each([
      ['light', TOOLTIP_LIGHT],
      ['dark', TOOLTIP_DARK],
    ] as const)(
      'is an inverse surface of at least 4.5:1 in the %s theme',
      async (_name, tokens) => {
        const { bubble } = await open(await setup(FIXED('left: 300px; top: 300px'), tokens));
        const style = getComputedStyle(bubble);
        expect(style.backgroundColor).toBe(tokens['--ck-color-fg']);
        expect(style.color).toBe(tokens['--ck-color-surface']);
        expect(contrastRatio(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
      },
    );

    it('takes its colours from --ck-tooltip-bg and --ck-tooltip-fg', async () => {
      const mounted = await setup(FIXED('left: 300px; top: 300px'));
      document.documentElement.style.setProperty('--ck-tooltip-bg', 'rgb(10, 80, 40)');
      document.documentElement.style.setProperty('--ck-tooltip-fg', 'rgb(250, 250, 200)');
      const { bubble } = await open(mounted);
      expect(getComputedStyle(bubble).backgroundColor).toBe('rgb(10, 80, 40)');
      expect(getComputedStyle(bubble).color).toBe('rgb(250, 250, 200)');
    });

    it.each([
      ['light', TOOLTIP_LIGHT],
      ['dark', TOOLTIP_DARK],
    ] as const)('has no axe violations while shown in the %s theme', async (_name, tokens) => {
      const mounted = await setup(
        `<main><button aria-label="Rest timer" ckTooltip="${LONG}" style="position: fixed; left: 300px; top: 300px">Rest</button></main>`,
        tokens,
      );
      await open(mounted);
      await wait(150);
      await expectNoAxeViolations(mounted.root);
      await expectNoAxeViolations(layer()!);
    });
  });

  describe('motion and forced colors', () => {
    it('fades in over --ck-duration-fast, and not at all under reduced motion', async () => {
      const first = await open(await setup(FIXED('left: 300px; top: 300px')));
      expect(getComputedStyle(first.bubble).transitionDuration).toBe('0.1s');
      expect(getComputedStyle(first.bubble).transitionProperty).toBe('opacity');
      first.fixture.destroy();
      cleanUp();
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const second = await open(await setup(FIXED('left: 300px; top: 300px')));
      expect(getComputedStyle(second.bubble).transitionDuration).toBe('0s');
    });

    it('reaches full opacity once the fade is over', async () => {
      const { bubble } = await open(await setup(FIXED('left: 300px; top: 300px')));
      await wait(250);
      expect(getComputedStyle(bubble).opacity).toBe('1');
    });

    it('paints Canvas, CanvasText and a CanvasText border in forced colors', async () => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const { bubble } = await open(await setup(FIXED('left: 300px; top: 300px')));
      const probe = document.createElement('div');
      probe.style.cssText =
        'color: CanvasText; background-color: Canvas; border: 1px solid CanvasText';
      document.body.append(probe);
      const expected = getComputedStyle(probe);
      const style = getComputedStyle(bubble);
      expect(style.color).toBe(expected.color);
      expect(style.backgroundColor).toBe(expected.backgroundColor);
      expect(style.borderTopColor).toBe(expected.borderTopColor);
      expect(style.borderTopWidth).toBe('1px');
      expect(style.borderTopStyle).toBe('solid');
      probe.remove();
    });

    it('draws no visible border outside forced colors, with the same box', async () => {
      const { bubble } = await open(await setup(FIXED('left: 300px; top: 300px')));
      expect(getComputedStyle(bubble).borderTopColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(bubble).borderTopWidth).toBe('1px');
    });
  });
});
