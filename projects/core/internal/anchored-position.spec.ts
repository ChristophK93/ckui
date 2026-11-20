import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { anchoredPosition } from './anchored-position';

const BUBBLE = { width: 100, height: 30 };

function setup(anchorStyle: string, direction: 'ltr' | 'rtl' = 'ltr') {
  const wrapper = document.createElement('div');
  wrapper.dir = direction;
  const anchor = document.createElement('button');
  anchor.style.cssText = `position: fixed; width: 40px; height: 20px; padding: 0; border: 0; ${anchorStyle}`;
  const bubble = document.createElement('div');
  bubble.style.cssText = `position: fixed; left: 0; top: 0; width: ${BUBBLE.width}px; height: ${BUBBLE.height}px`;
  wrapper.append(anchor, bubble);
  document.body.append(wrapper);
  return { anchor, bubble };
}

describe('anchoredPosition', () => {
  afterEach(async () => {
    document.body.replaceChildren();
    await page.viewport(800, 600);
  });

  it('centres the bubble above the anchor, a gap away', () => {
    const { anchor, bubble } = setup('left: 300px; top: 300px');
    expect(anchoredPosition(anchor, bubble, 'above', 8, 4)).toEqual({
      side: 'above',
      x: 300 + 20 - 50,
      y: 300 - 4 - 30,
    });
  });

  it('places it below, and at the start and end of the anchor, centred on the other axis', () => {
    const { anchor, bubble } = setup('left: 300px; top: 300px');
    expect(anchoredPosition(anchor, bubble, 'below', 8, 4)).toEqual({
      side: 'below',
      x: 270,
      y: 324,
    });
    expect(anchoredPosition(anchor, bubble, 'start', 8, 4)).toEqual({
      side: 'start',
      x: 196,
      y: 295,
    });
    expect(anchoredPosition(anchor, bubble, 'end', 8, 4)).toEqual({ side: 'end', x: 344, y: 295 });
  });

  it('uses no gap by default', () => {
    const { anchor, bubble } = setup('left: 300px; top: 300px');
    expect(anchoredPosition(anchor, bubble, 'above', 8).y).toBe(270);
  });

  it('flips to the opposite side when the preferred one has no room', () => {
    const top = setup('left: 300px; top: 10px');
    expect(anchoredPosition(top.anchor, top.bubble, 'above', 8, 4).side).toBe('below');
    const bottom = setup('left: 300px; bottom: 10px');
    expect(anchoredPosition(bottom.anchor, bottom.bubble, 'below', 8, 4).side).toBe('above');
    const left = setup('left: 10px; top: 300px');
    expect(anchoredPosition(left.anchor, left.bubble, 'start', 8, 4).side).toBe('end');
    const right = setup('right: 10px; top: 300px');
    expect(anchoredPosition(right.anchor, right.bubble, 'end', 8, 4).side).toBe('start');
  });

  it('flips exactly when the margin no longer fits, not before', () => {
    // Above needs top - gap - height >= margin, so top >= 8 + 4 + 30 = 42.
    const fits = setup('left: 300px; top: 42px');
    expect(anchoredPosition(fits.anchor, fits.bubble, 'above', 8, 4).side).toBe('above');
    document.body.replaceChildren();
    const short = setup('left: 300px; top: 41px');
    expect(anchoredPosition(short.anchor, short.bubble, 'above', 8, 4).side).toBe('below');
  });

  it('keeps the preferred side when the opposite has just as little room', () => {
    const { anchor, bubble } = setup('left: 300px; top: 20px');
    anchor.style.height = '560px';
    // Above has 20px of room, below has 600 - 580 = 20px.
    expect(anchoredPosition(anchor, bubble, 'above', 8, 4).side).toBe('above');
  });

  it('takes the side with more room when neither fits', async () => {
    await page.viewport(800, 100);
    const { anchor, bubble } = setup('left: 300px; top: 60px');
    expect(anchoredPosition(anchor, bubble, 'below', 8, 4).side).toBe('above');
  });

  it('shifts along the cross axis to stay a margin inside the viewport', () => {
    const left = setup('left: 0; top: 300px');
    expect(anchoredPosition(left.anchor, left.bubble, 'above', 8, 4).x).toBe(8);
    document.body.replaceChildren();
    const right = setup('right: 0; top: 300px');
    expect(anchoredPosition(right.anchor, right.bubble, 'above', 8, 4).x).toBe(
      document.documentElement.clientWidth - 8 - BUBBLE.width,
    );
    document.body.replaceChildren();
    const top = setup('left: 300px; top: 0');
    expect(anchoredPosition(top.anchor, top.bubble, 'end', 8, 4).y).toBe(8);
    document.body.replaceChildren();
    const bottom = setup('left: 300px; bottom: 0');
    expect(anchoredPosition(bottom.anchor, bottom.bubble, 'end', 8, 4).y).toBe(
      document.documentElement.clientHeight - 8 - BUBBLE.height,
    );
  });

  it('starts at the margin when the bubble is wider than the viewport allows', async () => {
    await page.viewport(100, 600);
    const { anchor, bubble } = setup('left: 30px; top: 300px');
    expect(anchoredPosition(anchor, bubble, 'above', 8, 4).x).toBe(8);
  });

  it('reads the margin and gap it is given', () => {
    const { anchor, bubble } = setup('left: 0; top: 300px');
    const placement = anchoredPosition(anchor, bubble, 'above', 24, 12);
    expect(placement.x).toBe(24);
    expect(placement.y).toBe(300 - 12 - 30);
  });

  it('mirrors start and end in right-to-left text', () => {
    const start = setup('left: 300px; top: 300px', 'rtl');
    expect(anchoredPosition(start.anchor, start.bubble, 'start', 8, 4)).toEqual({
      side: 'start',
      x: 344,
      y: 295,
    });
    document.body.replaceChildren();
    const end = setup('left: 300px; top: 300px', 'rtl');
    expect(anchoredPosition(end.anchor, end.bubble, 'end', 8, 4)).toEqual({
      side: 'end',
      x: 196,
      y: 295,
    });
  });

  it('flips start to end at the screen edge in right-to-left text', () => {
    const { anchor, bubble } = setup('right: 10px; top: 300px', 'rtl');
    expect(anchoredPosition(anchor, bubble, 'start', 8, 4).side).toBe('end');
  });

  it('does not change above and below in right-to-left text', () => {
    const { anchor, bubble } = setup('left: 300px; top: 300px', 'rtl');
    expect(anchoredPosition(anchor, bubble, 'above', 8, 4)).toEqual({
      side: 'above',
      x: 270,
      y: 266,
    });
  });

  it('works inside the visual viewport when the page is zoomed or the keyboard is open', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'visualViewport')!;
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { offsetLeft: 100, offsetTop: 50, width: 300, height: 200 },
    });
    try {
      const { anchor, bubble } = setup('left: 120px; top: 80px');
      // Above would end at y = 46, outside the visible area (top edge 50 plus the margin 8).
      expect(anchoredPosition(anchor, bubble, 'above', 8, 4).side).toBe('below');
      // The cross axis shifts to the visible left edge (100 + 8), not to the layout viewport's.
      expect(anchoredPosition(anchor, bubble, 'below', 8, 4).x).toBe(108);
    } finally {
      Object.defineProperty(window, 'visualViewport', original);
    }
  });

  it('measures the bubble fractionally', () => {
    const { anchor, bubble } = setup('left: 300px; top: 300px');
    bubble.style.width = '100.5px';
    expect(anchoredPosition(anchor, bubble, 'start', 8, 4).x).toBe(300 - 4 - 100.5);
  });
});
