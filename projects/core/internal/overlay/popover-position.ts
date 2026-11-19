import {
  ConnectedPosition,
  FlexibleConnectedPositionStrategy,
  Overlay,
} from '@angular/cdk/overlay';

/** Pixels of a length token (`--ck-space-1`), resolved through a probe so `rem` and `px` both work. */
export function tokenPixels(container: HTMLElement, token: string, fallback: number): number {
  const probe = container.ownerDocument.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;inline-size:var(${token}, ${fallback}px)`;
  container.append(probe);
  const pixels = probe.offsetWidth;
  probe.remove();
  return pixels;
}

/**
 * Below the anchor, aligned to its inline start; then above, then both again aligned to the inline
 * end. `start` and `end` follow the overlay's direction. Out of room, it shifts to stay on screen and
 * the panel's height is limited to the space left.
 */
export function popoverPosition(
  overlay: Overlay,
  anchor: HTMLElement,
  gap: number,
  margin: number,
): FlexibleConnectedPositionStrategy {
  const positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: gap },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -gap },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: gap },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -gap },
  ];
  return overlay
    .position()
    .flexibleConnectedTo(anchor)
    .withPositions(positions)
    .withPush(true)
    .withFlexibleDimensions(true)
    .withGrowAfterOpen(true)
    .withViewportMargin(margin);
}
