/** A sheet is dismissed by a drag past this share of its height... */
export const SWIPE_DISTANCE_RATIO = 1 / 3;
/** ...or by a flick at least this fast (px per ms) that has moved a little. */
export const SWIPE_FLICK_VELOCITY = 0.5;
export const SWIPE_FLICK_MIN_DISTANCE = 16;
/** The speed is measured over this many ms before release. */
const VELOCITY_WINDOW = 100;

export function shouldDismissSwipe(distance: number, height: number, velocity: number): boolean {
  if (distance <= 0 || height <= 0) {
    return false;
  }
  return (
    distance > height * SWIPE_DISTANCE_RATIO ||
    (velocity >= SWIPE_FLICK_VELOCITY && distance >= SWIPE_FLICK_MIN_DISTANCE)
  );
}

export interface SheetSwipeOptions {
  /** Contains the grab area (`[data-ck-sheet-grab]`); the swipe starts there. */
  readonly pane: HTMLElement;
  /** The element that follows the finger. */
  readonly panel: HTMLElement;
  readonly backdrop: HTMLElement;
  readonly duration: () => number;
  readonly easing: () => string;
  /** Called on release. `dismiss` says the swipe passed the threshold; return whether the overlay closed. */
  readonly onRelease: (dismiss: boolean) => boolean;
}

interface Sample {
  readonly offset: number;
  readonly time: number;
}

/** Makes the grab area of a bottom sheet draggable. Returns the function that removes it. */
export function attachSheetSwipe(options: SheetSwipeOptions): () => void {
  const { pane, panel, backdrop } = options;
  const doc = pane.ownerDocument;
  const now = (): number => (doc.defaultView as Window).performance.now();
  let pointerId: number | null = null;
  let startY = 0;
  let height = 0;
  let offset = 0;
  let samples: Sample[] = [];

  function setOffset(next: number): void {
    offset = Math.max(0, next);
    panel.style.transform = `translateY(${offset}px)`;
    backdrop.style.opacity = String(Math.max(0, 1 - offset / Math.max(height, 1)));
    samples.push({ offset, time: now() });
  }

  function velocity(): number {
    const current = now();
    const recent = samples.filter((sample) => current - sample.time <= VELOCITY_WINDOW);
    const first = recent[0];
    const last = recent[recent.length - 1];
    if (!first || !last) {
      return 0;
    }
    return (last.offset - first.offset) / Math.max(1, current - first.time);
  }

  function stopTracking(): void {
    pointerId = null;
    doc.removeEventListener('pointermove', onMove);
    doc.removeEventListener('pointerup', onUp);
    doc.removeEventListener('pointercancel', onCancel);
  }

  function snapBack(): void {
    const from = offset;
    panel.style.transform = '';
    backdrop.style.opacity = '';
    offset = 0;
    const duration = options.duration();
    if (from > 0 && duration > 0 && typeof panel.animate === 'function') {
      const timing = { duration, easing: options.easing() };
      panel.animate([{ transform: `translateY(${from}px)` }, { transform: 'none' }], timing);
      backdrop.animate(
        [{ opacity: String(Math.max(0, 1 - from / Math.max(height, 1))) }, { opacity: '1' }],
        timing,
      );
    }
  }

  function onDown(event: PointerEvent): void {
    const target = event.target;
    if (
      pointerId !== null ||
      !event.isPrimary ||
      event.button !== 0 ||
      !(target instanceof Element) ||
      !target.closest('[data-ck-sheet-grab]')
    ) {
      return;
    }
    pointerId = event.pointerId;
    startY = event.clientY;
    height = panel.getBoundingClientRect().height;
    offset = 0;
    samples = [{ offset: 0, time: now() }];
    try {
      (target as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured; the document listeners still work.
    }
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
    doc.addEventListener('pointercancel', onCancel);
  }

  function onMove(event: PointerEvent): void {
    if (event.pointerId === pointerId) {
      setOffset(event.clientY - startY);
    }
  }

  function onUp(event: PointerEvent): void {
    if (event.pointerId !== pointerId) {
      return;
    }
    setOffset(event.clientY - startY);
    const dismiss = shouldDismissSwipe(offset, height, velocity());
    stopTracking();
    if (!options.onRelease(dismiss)) {
      snapBack();
    }
  }

  function onCancel(event: PointerEvent): void {
    if (event.pointerId === pointerId) {
      stopTracking();
      snapBack();
    }
  }

  pane.addEventListener('pointerdown', onDown);
  return () => {
    pane.removeEventListener('pointerdown', onDown);
    stopTracking();
  };
}
