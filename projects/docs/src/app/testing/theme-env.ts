import { vi } from 'vitest';

/** Puts the test document in the state the docs site boots in, optionally with a forced theme. */
export function setTestTheme(theme: 'light' | 'dark' | null): void {
  const root = document.documentElement;
  root.classList.add('ck-root');
  if (theme === null) {
    root.removeAttribute('data-ck-theme');
  } else {
    root.setAttribute('data-ck-theme', theme);
  }
}

export function resetTestTheme(): void {
  const root = document.documentElement;
  root.classList.remove('ck-root');
  root.removeAttribute('data-ck-theme');
  try {
    localStorage.removeItem('ckui-docs-theme');
  } catch {
    // Storage is unavailable; nothing to clean up.
  }
}

/** Makes every Storage method throw, like a browser with blocked site data. */
export function breakStorage(): void {
  const failure = (): never => {
    throw new DOMException('blocked', 'SecurityError');
  };
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(failure);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(failure);
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(failure);
}

/** Waits for finite transitions and animations, so axe never reads a colour halfway between two values. */
export async function settleAnimations(): Promise<void> {
  const finite = document
    .getAnimations()
    .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
  await Promise.all(finite.map((animation) => animation.finished.catch(() => undefined)));
}
