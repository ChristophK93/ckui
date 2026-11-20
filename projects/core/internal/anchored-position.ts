/** Where a bubble sits relative to its anchor. `start` and `end` follow the anchor's direction. */
export type CkAnchoredSide = 'above' | 'below' | 'start' | 'end';

export interface CkAnchoredPlacement {
  /** The side actually used: the preferred one, or the opposite when the preferred had no room. */
  readonly side: CkAnchoredSide;
  /** Viewport coordinates of the bubble's top-left corner, for `position: fixed`. */
  readonly x: number;
  readonly y: number;
}

const OPPOSITE: Record<CkAnchoredSide, CkAnchoredSide> = {
  above: 'below',
  below: 'above',
  start: 'end',
  end: 'start',
};

interface Area {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The part of the layout viewport the user sees: the visual viewport when there is one (zoom, soft keyboard). */
function visibleArea(document: Document): Area {
  const view = document.defaultView;
  const visual = view?.visualViewport;
  if (visual) {
    return {
      left: visual.offsetLeft,
      top: visual.offsetTop,
      right: visual.offsetLeft + visual.width,
      bottom: visual.offsetTop + visual.height,
    };
  }
  const root = document.documentElement;
  return { left: 0, top: 0, right: root.clientWidth, bottom: root.clientHeight };
}

function clamp(value: number, low: number, high: number): number {
  // A bubble wider than the area starts at the low edge instead of flipping the order.
  return Math.max(low, Math.min(value, high));
}

/**
 * Places `bubble` next to `anchor` on the preferred side, `gap` pixels away. Without room on that
 * side it takes the opposite one (or, with room on neither, the side with more room), and along the
 * other axis it shifts to stay `margin` pixels inside the viewport. The bubble has to be rendered, and
 * must not be scaled: its size is read from its box.
 */
export function anchoredPosition(
  anchor: HTMLElement,
  bubble: HTMLElement,
  side: CkAnchoredSide,
  margin: number,
  gap = 0,
): CkAnchoredPlacement {
  const document = anchor.ownerDocument;
  const rtl = document.defaultView?.getComputedStyle(anchor).direction === 'rtl';
  const rect = anchor.getBoundingClientRect();
  const area = visibleArea(document);
  // Fractional sizes: a rounded width would leave the bubble a fraction of a pixel off its gap.
  const { width, height } = bubble.getBoundingClientRect();
  const inner: Area = {
    left: area.left + margin,
    top: area.top + margin,
    right: area.right - margin,
    bottom: area.bottom - margin,
  };

  // Room on a side, minus what the bubble needs (negative when it does not fit).
  const spare = (candidate: CkAnchoredSide): number => {
    switch (candidate) {
      case 'above':
        return rect.top - gap - height - inner.top;
      case 'below':
        return inner.bottom - (rect.bottom + gap + height);
      default: {
        const toLeft = (candidate === 'start') !== rtl;
        return toLeft
          ? rect.left - gap - width - inner.left
          : inner.right - (rect.right + gap + width);
      }
    }
  };

  const preferred = side;
  const opposite = OPPOSITE[side];
  const used = spare(preferred) >= 0 || spare(preferred) >= spare(opposite) ? preferred : opposite;

  let x: number;
  let y: number;
  if (used === 'above' || used === 'below') {
    y = used === 'above' ? rect.top - gap - height : rect.bottom + gap;
    x = clamp(rect.left + rect.width / 2 - width / 2, inner.left, inner.right - width);
  } else {
    const toLeft = (used === 'start') !== rtl;
    x = toLeft ? rect.left - gap - width : rect.right + gap;
    y = clamp(rect.top + rect.height / 2 - height / 2, inner.top, inner.bottom - height);
  }
  return { side: used, x, y };
}
