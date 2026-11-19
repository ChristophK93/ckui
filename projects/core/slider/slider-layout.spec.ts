import { TestBed } from '@angular/core/testing';
import { CK_SIZES, CkSize } from '@ckui/core';
import { cdp, page, userEvent } from 'vitest/browser';
import { contrastRatio } from '../testing/contrast';
import {
  DARK_TOKENS,
  TOKENS,
  fillOf,
  mount,
  pointer,
  query,
  railOf,
  settle,
  thumbOf,
  trackOf,
} from '../testing/slider-host';

const HEIGHTS: Record<CkSize, number> = { sm: 32, md: 40, lg: 48, xl: 60 };
const THUMBS: Record<CkSize, number> = { sm: 16, md: 20, lg: 24, xl: 28 };
/** The coarse-pointer values of `tokens.css`, set inline. */
const COARSE_TOKENS =
  '--ck-control-height-sm:44px;--ck-control-height-md:44px;--ck-control-font-size-sm:16px;--ck-control-font-size-md:16px;--ck-target-min:44px';
const MOTION = TOKENS;

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

async function emulate(features: { name: string; value: string }[]): Promise<void> {
  await (cdp() as unknown as Session).send('Emulation.setEmulatedMedia', { features });
}

/** The computed colour of a CSS colour keyword (a system colour included) under the current emulation. */
function resolveColor(root: HTMLElement, value: string): string {
  const probe = document.createElement('div');
  probe.style.color = value;
  root.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

const slider = (attributes = '') =>
  `<ck-slider aria-label="Grade" ${attributes} [value]="value()" />`;
const rect = (element: Element) => element.getBoundingClientRect();
const centre = (element: Element): [number, number] => {
  const box = rect(element);
  return [box.left + box.width / 2, box.top + box.height / 2];
};
const hit = (x: number, y: number) => document.elementFromPoint(x, y);
const style = (root: HTMLElement, selector: string) => getComputedStyle(query(root, selector));

describe('CkSlider layout', () => {
  afterEach(async () => {
    document.body.replaceChildren();
    document.body.removeAttribute('dir');
    document.documentElement.style.removeProperty('font-size');
    TestBed.resetTestingModule();
    await emulate([]);
    await page.viewport(800, 600);
  });

  describe('size and hit area', () => {
    it.each(CK_SIZES.map((size) => [size, HEIGHTS[size], THUMBS[size]] as const))(
      'is the control height at %s (%spx) with a %spx thumb and the whole height as hit area',
      async (size, height, thumb) => {
        const { fixture, root } = mount(slider(`size="${size}"`));
        await settle(fixture);
        expect(rect(query(root, 'ck-slider')).height).toBe(height);
        expect(rect(trackOf(root)).height).toBe(height);
        expect(rect(thumbOf(root)).width).toBe(thumb);
        expect(rect(thumbOf(root)).height).toBe(thumb);
        const box = rect(trackOf(root));
        const [x] = centre(railOf(root));
        for (const y of [box.top + 1, box.top + height / 2, box.bottom - 1]) {
          expect(hit(x + 40, y)?.closest('.ck-slider__track'), `y ${y}`).toBe(trackOf(root));
        }
      },
    );

    it('makes the thumb 1.25rem at md and 1.75rem at xl, from the root font size', async () => {
      const { fixture, root } = mount(`${slider('size="md"')}${slider('size="xl"')}`);
      document.documentElement.style.fontSize = '20px';
      await settle(fixture);
      expect(rect(thumbOf(root, 0)).width).toBe(25);
      expect(rect(thumbOf(root, 1)).width).toBe(35);
    });

    it('takes the height from the control tokens set on the page', async () => {
      const { fixture, root } = mount(slider());
      root.setAttribute('style', `${root.getAttribute('style')};--ck-control-height-md:52px`);
      await settle(fixture);
      expect(rect(query(root, 'ck-slider')).height).toBe(52);
      expect(rect(trackOf(root)).height).toBe(52);
    });

    it('gives the thumb a hit area of the minimum target size around its centre', async () => {
      const { fixture, root } = mount(slider());
      await settle(fixture);
      const [x, y] = centre(thumbOf(root));
      // The visible thumb is 20px, the target minimum 24px.
      for (const [dx, dy] of [
        [11, 0],
        [-11, 0],
        [0, 11],
        [0, -11],
      ]) {
        expect(hit(x + dx, y + dy), `${dx},${dy}`).toBe(thumbOf(root));
      }
      for (const [dx, dy] of [
        [14, 0],
        [-14, 0],
      ]) {
        expect(hit(x + dx, y + dy), `${dx},${dy}`).not.toBe(thumbOf(root));
      }
    });

    it('grows the thumb hit area to 44px with the coarse tokens, also for the small thumb', async () => {
      const { fixture, root } = mount(slider('size="sm"'));
      root.setAttribute('style', `${root.getAttribute('style')};${COARSE_TOKENS}`);
      await settle(fixture);
      expect(rect(thumbOf(root)).width).toBe(16);
      const [x, y] = centre(thumbOf(root));
      for (const [dx, dy] of [
        [21, 0],
        [-21, 0],
        [0, 21],
        [0, -21],
      ]) {
        expect(hit(x + dx, y + dy), `${dx},${dy}`).toBe(thumbOf(root));
      }
      expect(hit(x + 24, y)).not.toBe(thumbOf(root));
      expect(rect(trackOf(root)).height).toBe(44);
    });

    it('keeps the whole hit area of the thumb inside the control at both ends', async () => {
      const { fixture, host, root } = mount(slider(), (testHost) => testHost.value.set(0));
      root.setAttribute('style', `${root.getAttribute('style')};${COARSE_TOKENS}`);
      await settle(fixture);
      const box = rect(query(root, 'ck-slider'));
      let [x, y] = centre(thumbOf(root));
      expect(hit(x - 21, y)).toBe(thumbOf(root));
      expect(x - 22).toBeGreaterThanOrEqual(box.left);
      host.value.set(100);
      await settle(fixture);
      [x, y] = centre(thumbOf(root));
      expect(hit(x + 21, y)).toBe(thumbOf(root));
      expect(x + 22).toBeLessThanOrEqual(box.right);
    });

    it('lets a press on the hit area outside the drawn thumb grab it', async () => {
      const { fixture, root } = mount(slider());
      await settle(fixture);
      const [x, y] = centre(thumbOf(root));
      const target = hit(x + 11, y)!;
      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        pointerId: 1,
        button: 0,
        clientX: x + 11,
        clientY: y,
      });
      target.dispatchEvent(event);
      await settle(fixture);
      expect(document.activeElement).toBe(thumbOf(root));
      expect(query(root, 'ck-slider').classList.contains('ck-slider--pressing')).toBe(true);
    });
  });

  describe('position', () => {
    it('puts the thumb centre at the fraction of the rail and the fill up to it', async () => {
      const { fixture, root } = mount(slider('[min]="-10" [max]="20"'), (host) =>
        host.value.set(5),
      );
      await settle(fixture);
      const rail = railOf(root);
      const inner = rail.clientWidth;
      const [thumbX] = centre(thumbOf(root));
      expect(thumbX).toBeCloseTo(rect(rail).left + rail.clientLeft + inner / 2, 0);
      expect(rect(fillOf(root)).width).toBeCloseTo(inner / 2, 0);
    });

    it('is at both ends of the inner rail for min and max', async () => {
      const { fixture, host, root } = mount(slider(), (testHost) => testHost.value.set(0));
      await settle(fixture);
      const rail = railOf(root);
      const left = rect(rail).left + rail.clientLeft;
      expect(centre(thumbOf(root))[0]).toBeCloseTo(left, 0);
      host.value.set(100);
      await settle(fixture);
      expect(centre(thumbOf(root))[0]).toBeCloseTo(left + rail.clientWidth, 0);
    });

    it('starts at the right in right-to-left text and fills from there', async () => {
      const { fixture, host, root } = mount(`<div dir="rtl">${slider()}</div>`, (testHost) =>
        testHost.value.set(25),
      );
      await settle(fixture);
      const rail = railOf(root);
      const right = rect(rail).right - rail.clientLeft;
      expect(centre(thumbOf(root))[0]).toBeCloseTo(right - rail.clientWidth * 0.25, 0);
      expect(rect(fillOf(root)).right).toBeCloseTo(right, 0);
      host.value.set(0);
      await settle(fixture);
      expect(centre(thumbOf(root))[0]).toBeCloseTo(right, 0);
    });

    it('is not moved by a global margin and padding reset', async () => {
      const { fixture, root } = mount(slider(), (host) => host.value.set(25));
      await settle(fixture);
      const before = [centre(thumbOf(root)), centre(fillOf(root)), centre(railOf(root))];
      const reset = document.createElement('style');
      reset.textContent = '*, *::before, *::after { margin: 0; padding: 0; }';
      document.head.appendChild(reset);
      try {
        expect([centre(thumbOf(root)), centre(fillOf(root)), centre(railOf(root))]).toEqual(before);
        const [x, y] = centre(thumbOf(root));
        expect(hit(x + 11, y)).toBe(thumbOf(root));
      } finally {
        reset.remove();
      }
    });

    it('keeps the thumb on the pointer while dragging', async () => {
      const { fixture, root } = mount(slider());
      await settle(fixture);
      pointer(trackOf(root), 'pointerdown', { at: 0.25 });
      await settle(fixture);
      const rail = railOf(root);
      expect(centre(thumbOf(root))[0]).toBeCloseTo(rect(rail).left + rect(rail).width * 0.25, -1);
      pointer(trackOf(root), 'pointerup', { at: 0.25 });
    });
  });

  describe('the shown value', () => {
    it('keeps the track the same width while the value changes, from the widest limit', async () => {
      const { fixture, host, root } = mount(
        slider('showValue unit="%" [min]="-10" [max]="1000" [step]="0.5"'),
        (testHost) => testHost.value.set(0),
      );
      await settle(fixture);
      const before = rect(trackOf(root)).width;
      for (const value of [-10, 7.5, 1000]) {
        host.value.set(value);
        await settle(fixture);
        expect(rect(trackOf(root)).width, String(value)).toBe(before);
      }
    });

    it('sits at the inline end, after the track, and is not part of the hit area of the track', async () => {
      const { fixture, root } = mount(slider('showValue'));
      await settle(fixture);
      expect(rect(query(root, '.ck-slider__value')).left).toBeGreaterThanOrEqual(
        rect(trackOf(root)).right - 0.5,
      );
    });

    it('stays inside a 390px page with a long unit and a huge number, and leaves the track room', async () => {
      await page.viewport(390, 844);
      const { fixture, root } = mount(
        `<div style="padding: 16px; box-sizing: border-box; inline-size: 100%">
           ${slider('showValue size="xl" unit="watts of mean maximal power over twenty minutes" [min]="0" [max]="1000000000000" [step]="1"')}
         </div>`,
        (host) => host.value.set(987654321012),
      );
      await settle(fixture);
      expect(window.innerWidth).toBe(390);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      const host = rect(query(root, 'ck-slider'));
      const value = rect(query(root, '.ck-slider__value'));
      expect(host.right).toBeLessThanOrEqual(390 - 16 + 0.5);
      expect(value.width).toBeLessThanOrEqual(host.width / 2 + 0.5);
      expect(rect(trackOf(root)).width).toBeGreaterThanOrEqual(host.width * 0.4);
      expect(value.right).toBeLessThanOrEqual(host.right + 0.5);
    });

    it('does not overflow a 390px page flush with the edges, with the thumb at either end', async () => {
      await page.viewport(390, 844);
      const { fixture, host, root } = mount(slider('size="xl"'), (testHost) =>
        testHost.value.set(100),
      );
      root.setAttribute('style', `${root.getAttribute('style')};${COARSE_TOKENS}`);
      await settle(fixture);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      host.value.set(0);
      await settle(fixture);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    });

    it('fits a settings row with a label next to it', async () => {
      await page.viewport(390, 844);
      const { fixture, root } = mount(
        `<div style="display: flex; align-items: center; gap: 12px; padding: 16px; box-sizing: border-box; inline-size: 100%">
           <span>Grade</span>${slider('showValue unit="%" [min]="-10" [max]="20"')}
         </div>`,
      );
      await settle(fixture);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
      expect(rect(query(root, 'ck-slider')).right).toBeLessThanOrEqual(390 - 16 + 0.5);
      expect(rect(trackOf(root)).width).toBeGreaterThan(100);
    });
  });

  describe('look', () => {
    it('paints the rail with the control colour, the fill primary and the thumb with the text colour', async () => {
      const { fixture, root } = mount(slider());
      await settle(fixture);
      expect(style(root, '.ck-slider__rail').backgroundColor).toBe('rgb(240, 240, 244)');
      expect(style(root, '.ck-slider__rail').borderTopColor).toBe('rgb(110, 110, 120)');
      expect(style(root, '.ck-slider__rail').borderTopLeftRadius).toBe('9999px');
      expect(style(root, '.ck-slider__rail').height).toBe('8px');
      expect(style(root, '.ck-slider__fill').backgroundColor).toBe('rgb(79, 70, 229)');
      expect(style(root, '.ck-slider__thumb').backgroundColor).toBe('rgb(20, 20, 30)');
      expect(style(root, '.ck-slider__thumb').borderTopColor).toBe('rgb(250, 250, 252)');
      expect(style(root, '.ck-slider__thumb').borderTopWidth).toBe('2px');
      expect(style(root, 'ck-slider').fontVariantNumeric).toBe('tabular-nums');
    });

    it('restyles with its own tokens', async () => {
      const { fixture, root } = mount(
        slider(
          'style="--ck-slider-track: rgb(1, 2, 3); --ck-slider-fill: rgb(4, 5, 6); --ck-slider-thumb-bg: rgb(7, 8, 9); --ck-slider-thumb-border: rgb(10, 11, 12); --ck-slider-thickness: 14px"',
        ),
      );
      await settle(fixture);
      expect(style(root, '.ck-slider__rail').backgroundColor).toBe('rgb(1, 2, 3)');
      expect(style(root, '.ck-slider__rail').height).toBe('14px');
      expect(style(root, '.ck-slider__fill').backgroundColor).toBe('rgb(4, 5, 6)');
      expect(style(root, '.ck-slider__thumb').backgroundColor).toBe('rgb(7, 8, 9)');
      expect(style(root, '.ck-slider__thumb').borderTopColor).toBe('rgb(10, 11, 12)');
    });

    it.each([
      ['light', TOKENS],
      ['dark', DARK_TOKENS],
    ])(
      'keeps the fill, the thumb and the ring 3:1 from what they sit on in the %s theme',
      async (_name, tokens) => {
        const { fixture, root } = mount(slider(), undefined, undefined, tokens);
        await settle(fixture);
        const rail = style(root, '.ck-slider__rail').backgroundColor;
        const fill = style(root, '.ck-slider__fill').backgroundColor;
        const thumb = style(root, '.ck-slider__thumb').backgroundColor;
        const ring = style(root, '.ck-slider__thumb').borderTopColor;
        expect(contrastRatio(fill, rail)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(thumb, rail)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(thumb, ring)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(ring, fill)).toBeGreaterThanOrEqual(3);
      },
    );

    it('draws the focus ring around the thumb for the keyboard', async () => {
      const { fixture, root } = mount(`<button id="before">Before</button>${slider()}`);
      await settle(fixture);
      expect(style(root, '.ck-slider__thumb').outlineStyle).toBe('none');
      query(root, '#before').focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(thumbOf(root));
      const ring = style(root, '.ck-slider__thumb');
      expect(ring.outlineStyle).toBe('solid');
      expect(ring.outlineWidth).toBe('2px');
      expect(ring.outlineColor).toBe('rgb(0, 0, 255)');
      expect(ring.outlineOffset).toBe('2px');
    });

    it('greys out a disabled slider and shows the not-allowed cursor', async () => {
      const { fixture, root } = mount(
        `<ck-slider aria-label="A" showValue disabled [value]="40" /><ck-slider aria-label="B" showValue [value]="40" />`,
      );
      await settle(fixture);
      const grey = 'rgb(150, 150, 160)';
      expect(getComputedStyle(root.querySelectorAll('.ck-slider__fill')[0]).backgroundColor).toBe(
        grey,
      );
      expect(getComputedStyle(root.querySelectorAll('.ck-slider__thumb')[0]).backgroundColor).toBe(
        grey,
      );
      expect(getComputedStyle(root.querySelectorAll('.ck-slider__value')[0]).color).toBe(grey);
      expect(getComputedStyle(trackOf(root, 0)).cursor).toBe('not-allowed');
      expect(getComputedStyle(root.querySelectorAll('.ck-slider__fill')[1]).backgroundColor).toBe(
        'rgb(79, 70, 229)',
      );
    });

    it('scales the thumb while pressed, with a transition', async () => {
      const { fixture, root } = mount(slider());
      await settle(fixture);
      expect(style(root, '.ck-slider__thumb').transform).toBe('none');
      pointer(trackOf(root), 'pointerdown', { at: 0.5 });
      await settle(fixture);
      expect(style(root, '.ck-slider__thumb').transform).not.toBe('none');
      expect(style(root, '.ck-slider__thumb').transitionDuration).toBe('0.1s');
      pointer(trackOf(root), 'pointerup', { at: 0.5 });
      await settle(fixture);
    });
  });

  describe('forced colors', () => {
    const forced = async (template: string) => {
      await emulate([{ name: 'forced-colors', value: 'active' }]);
      const mounted = mount(template);
      await settle(mounted.fixture);
      return mounted;
    };

    it('draws a CanvasText border on the rail, a Highlight fill and a Canvas thumb with a ButtonText border', async () => {
      const { root } = await forced(slider());
      expect(style(root, '.ck-slider__rail').borderTopColor).toBe(resolveColor(root, 'CanvasText'));
      expect(style(root, '.ck-slider__rail').backgroundColor).toBe(resolveColor(root, 'Canvas'));
      expect(style(root, '.ck-slider__fill').backgroundColor).toBe(resolveColor(root, 'Highlight'));
      expect(style(root, '.ck-slider__thumb').backgroundColor).toBe(resolveColor(root, 'Canvas'));
      expect(style(root, '.ck-slider__thumb').borderTopColor).toBe(
        resolveColor(root, 'ButtonText'),
      );
      expect(style(root, '.ck-slider__thumb').borderTopWidth).toBe('2px');
    });

    it('writes the shown value in the text colour', async () => {
      const { root } = await forced(slider('showValue'));
      expect(style(root, '.ck-slider__value').color).toBe(resolveColor(root, 'CanvasText'));
    });

    it('draws a disabled and a fieldset-disabled slider in GrayText, and an enabled one not', async () => {
      const { root } = await forced(
        `<fieldset disabled><ck-slider aria-label="A" showValue [value]="40" /></fieldset>
         <ck-slider aria-label="B" showValue disabled [value]="40" />
         <ck-slider aria-label="C" showValue [value]="40" />`,
      );
      const gray = resolveColor(root, 'GrayText');
      const [fieldset, disabled, live] = Array.from(root.querySelectorAll('ck-slider'));
      const of = (host: Element, selector: string) =>
        getComputedStyle(host.querySelector(selector)!);
      for (const host of [fieldset, disabled]) {
        expect(of(host, '.ck-slider__rail').borderTopColor).toBe(gray);
        expect(of(host, '.ck-slider__fill').backgroundColor).toBe(gray);
        expect(of(host, '.ck-slider__thumb').borderTopColor).toBe(gray);
        expect(of(host, '.ck-slider__thumb').backgroundColor).toBe(resolveColor(root, 'Canvas'));
        expect(of(host, '.ck-slider__value').color).toBe(gray);
      }
      expect(of(live, '.ck-slider__rail').borderTopColor).not.toBe(gray);
      expect(of(live, '.ck-slider__fill').backgroundColor).not.toBe(gray);
      expect(of(live, '.ck-slider__value').color).not.toBe(gray);
    });

    it('draws the keyboard focus ring in Highlight at 2px', async () => {
      const { root } = await forced(`<button id="before">Before</button>${slider()}`);
      query(root, '#before').focus();
      await userEvent.tab();
      const ring = style(root, '.ck-slider__thumb');
      expect(ring.outlineColor).toBe(resolveColor(root, 'Highlight'));
      expect(ring.outlineStyle).toBe('solid');
      expect(ring.outlineWidth).toBe('2px');
      expect(ring.outlineOffset).toBe('2px');
    });
  });

  describe('reduced motion', () => {
    it('scales the pressed thumb with a transition normally and with none under reduced motion', async () => {
      const normal = mount(slider(), undefined, undefined, MOTION);
      await settle(normal.fixture);
      expect(style(normal.root, '.ck-slider__thumb').transitionDuration).toBe('0.1s');
      document.body.replaceChildren();
      TestBed.resetTestingModule();
      await emulate([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      const reduced = mount(slider(), undefined, undefined, MOTION);
      await settle(reduced.fixture);
      expect(style(reduced.root, '.ck-slider__thumb').transitionDuration).toBe('0s');
      for (const selector of ['.ck-slider__fill', '.ck-slider__rail', '.ck-slider__track']) {
        expect(style(reduced.root, selector).transitionDuration).toBe('0s');
      }
    });
  });
});
