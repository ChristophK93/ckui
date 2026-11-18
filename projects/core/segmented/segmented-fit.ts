/** Pixel sizes below this scale difference from 1 are rounding noise, not an ancestor transform. */
const SCALE_NOISE = 0.005;

/** How much an ancestor transform (a dialog opening with `scale(0.96)`) scales what rects report. */
function scaleOf(group: HTMLElement): number {
  const layout = group.offsetWidth;
  const scale = layout > 0 ? group.getBoundingClientRect().width / layout : 1;
  return Math.abs(scale - 1) < SCALE_NOISE ? 1 : scale;
}

/** The width a segment needs to show its whole content: padding, icon, gap and untruncated text. */
function naturalWidth(segment: HTMLElement, scale: number): number {
  const view = segment.ownerDocument.defaultView!;
  const style = view.getComputedStyle(segment);
  let width = parseFloat(style.paddingInlineStart) + parseFloat(style.paddingInlineEnd);
  const content = segment.querySelector<HTMLElement>('.ck-segment__content');
  if (content === null) {
    return width;
  }
  const gap = parseFloat(view.getComputedStyle(content).columnGap) || 0;
  let shown = 0;
  for (const child of Array.from(content.children)) {
    if (view.getComputedStyle(child).display === 'none') {
      continue;
    }
    let childWidth = child.getBoundingClientRect().width;
    if (child.classList.contains('ck-segment__label')) {
      // A truncated label is clipped, but its text keeps its full box.
      const range = child.ownerDocument.createRange();
      range.selectNodeContents(child);
      childWidth = range.getBoundingClientRect().width;
    }
    width += childWidth / scale + (shown > 0 ? gap : 0);
    shown += 1;
  }
  return width;
}

/**
 * Whether the segments, each at its natural width, no longer fit in the group; `null` while the
 * group has no size (not rendered). All sizes are in layout pixels, whatever transform surrounds it.
 */
export function overflows(group: HTMLElement, segments: readonly HTMLElement[]): boolean | null {
  const rendered = group.getBoundingClientRect().width;
  if (rendered === 0) {
    return null;
  }
  const scale = scaleOf(group);
  const needed = segments.reduce((sum, segment) => sum + naturalWidth(segment, scale), 0);
  return needed > rendered / scale + 0.5;
}
