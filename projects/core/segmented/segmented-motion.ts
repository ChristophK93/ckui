const FALLBACK_DURATION_MS = 200;

/** `200ms`, `.2s` or a bare number of milliseconds; anything else is `null`. */
function parseDuration(text: string): number | null {
  const match = /^([\d.]+)(ms|s)?$/.exec(text.trim());
  if (match === null) {
    return null;
  }
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? (match[2] === 's' ? amount * 1000 : amount) : null;
}

/** Horizontal extent in pixels, from the left edge of the group. */
export interface SlideBox {
  readonly left: number;
  readonly width: number;
}

/** A slide in progress, remembered so a change in mid-slide can continue from where it is drawn. */
export interface Slide {
  readonly animation: Animation;
  readonly from: SlideBox;
  readonly to: SlideBox;
}

function relative(box: DOMRect, group: DOMRect): SlideBox {
  return { left: box.left - group.left, width: box.width };
}

/** Where a running slide is drawn now, following the eased progress of its animation. */
function drawn(slide: Slide): SlideBox {
  const progress = slide.animation.effect?.getComputedTiming().progress ?? 1;
  return {
    left: slide.from.left + (slide.to.left - slide.from.left) * progress,
    width: slide.from.width + (slide.to.width - slide.from.width) * progress,
  };
}

/**
 * Slides the indicator from where it is shown to the segment it now sits in (FLIP): the layout has
 * already moved it, so the animation starts from the old box and ends at no offset. Width is
 * animated too, since the segments can differ in width. Returns `null` when nothing was started.
 */
export function slideIndicator(
  indicator: HTMLElement,
  group: HTMLElement,
  previous: HTMLElement,
  current: HTMLElement,
  running: Slide | null,
): Slide | null {
  // The running slide was built for the old segment: its offsets mean nothing after the layout move.
  const wasRunning =
    running !== null && ['running', 'paused'].includes(running.animation.playState);
  const shown = wasRunning ? drawn(running) : null;
  for (const animation of indicator.getAnimations()) {
    animation.cancel();
  }
  const style = indicator.ownerDocument.defaultView!.getComputedStyle(indicator);
  const duration =
    parseDuration(style.getPropertyValue('--ck-duration-normal')) ?? FALLBACK_DURATION_MS;
  if (typeof indicator.animate !== 'function' || duration <= 0) {
    return null;
  }
  const groupBox = group.getBoundingClientRect();
  const to = relative(indicator.getBoundingClientRect(), groupBox);
  if (to.width === 0) {
    return null;
  }

  let from = shown;
  if (from === null) {
    // The old box is the previous segment's, inset the way the indicator is inside its own.
    const inset = (current.getBoundingClientRect().width - to.width) / 2;
    const old = relative(previous.getBoundingClientRect(), groupBox);
    from = { left: old.left + inset, width: old.width - 2 * inset };
  }
  if (from.width <= 0) {
    return null;
  }

  // The inline-size override keeps the box on its inline-start edge, which is the right one in RTL.
  const rtl = indicator.matches(':dir(rtl)');
  const offset = rtl ? from.left + from.width - (to.left + to.width) : from.left - to.left;
  const easing = style.getPropertyValue('--ck-ease-standard').trim() || 'ease';
  const keyframes = [
    { transform: `translateX(${offset}px)`, inlineSize: `${from.width}px` },
    { transform: 'translateX(0)', inlineSize: `${to.width}px` },
  ];
  let animation: Animation;
  try {
    animation = indicator.animate(keyframes, { duration, easing });
  } catch {
    // A custom easing the browser rejects: the standard curve is not worth losing the slide.
    animation = indicator.animate(keyframes, { duration, easing: 'ease' });
  }
  return { animation, from, to };
}
