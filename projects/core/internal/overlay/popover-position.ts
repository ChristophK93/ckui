import {
  ConnectedPosition,
  FlexibleConnectedPositionStrategy,
  Overlay,
} from '@angular/cdk/overlay';

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
