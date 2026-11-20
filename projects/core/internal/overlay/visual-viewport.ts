/** The height a modal, sheet or side panel may take: the visual viewport while one is tracked. */
export const VIEWPORT_HEIGHT = 'var(--_ck-overlay-viewport-height, 100dvh)';

export interface ViewportFollower {
  /** Keeps the overlay wrapper inside the visual viewport until the returned function is called. */
  follow(wrapper: HTMLElement): () => void;
  /** Stops following every wrapper. */
  destroy(): void;
}

/**
 * Keeps modal overlays inside the visual viewport. A soft keyboard shrinks only the visual viewport
 * (iOS, and Android Chrome by default), not the layout viewport the overlay container is sized to.
 * A sheet sized to the layout viewport sits partly behind the keyboard, and the browser pans the
 * page to show the focused field, which pushes the top of a tall sheet off the screen.
 */
export function createViewportFollower(view: Window | null): ViewportFollower {
  const wrappers = new Set<HTMLElement>();
  let viewport: VisualViewport | null = null;

  const place = (wrapper: HTMLElement): void => {
    if (!viewport) {
      return;
    }
    wrapper.style.top = `${viewport.offsetTop}px`;
    wrapper.style.height = `${viewport.height}px`;
    wrapper.style.setProperty('--_ck-overlay-viewport-height', `${viewport.height}px`);
  };

  const sync = (): void => {
    for (const wrapper of wrappers) {
      place(wrapper);
    }
  };

  // The keyboard just appeared or went: the focused field may now be under it or off the list.
  const onResize = (): void => {
    sync();
    const focused = view?.document.activeElement;
    const top = [...wrappers].at(-1);
    if (top && focused instanceof HTMLElement && top.contains(focused)) {
      focused.scrollIntoView({ block: 'nearest' });
    }
  };

  const listen = (active: boolean): void => {
    if (active) {
      viewport = view?.visualViewport ?? null;
      viewport?.addEventListener('resize', onResize);
      viewport?.addEventListener('scroll', sync);
    } else {
      viewport?.removeEventListener('resize', onResize);
      viewport?.removeEventListener('scroll', sync);
      viewport = null;
    }
  };

  const release = (wrapper: HTMLElement): void => {
    if (!wrappers.delete(wrapper)) {
      return;
    }
    wrapper.style.removeProperty('top');
    wrapper.style.removeProperty('height');
    wrapper.style.removeProperty('--_ck-overlay-viewport-height');
    if (wrappers.size === 0) {
      listen(false);
    }
  };

  return {
    follow(wrapper) {
      if (wrappers.size === 0) {
        listen(true);
      }
      wrappers.add(wrapper);
      place(wrapper);
      return () => release(wrapper);
    },
    destroy() {
      for (const wrapper of [...wrappers]) {
        release(wrapper);
      }
    },
  };
}
