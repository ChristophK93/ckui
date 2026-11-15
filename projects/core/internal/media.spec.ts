import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCkui } from '@ckui/core';
import { vi } from 'vitest';
import { page } from 'vitest/browser';
import { CkMedia } from './media';

interface Environment {
  width: number;
  coarse: boolean;
  reducedMotion: boolean;
}

/** A controllable stand-in for matchMedia that understands the three queries CkMedia uses. */
function fakeMatchMedia(environment: Environment) {
  const entries: {
    query: string;
    list: MediaQueryList;
    listeners: Set<(event: unknown) => void>;
  }[] = [];

  function matches(query: string): boolean {
    const maxWidth = /^\(max-width: ([\d.]+)px\)$/.exec(query);
    if (maxWidth) {
      return environment.width <= Number(maxWidth[1]);
    }
    if (query === '(pointer: coarse)') {
      return environment.coarse;
    }
    if (query === '(prefers-reduced-motion: reduce)') {
      return environment.reducedMotion;
    }
    return false;
  }

  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
    const listeners = new Set<(event: unknown) => void>();
    const list = {
      media: query,
      get matches() {
        return matches(query);
      },
      addListener: (listener: (event: unknown) => void) => listeners.add(listener),
      removeListener: (listener: (event: unknown) => void) => listeners.delete(listener),
      addEventListener: (_type: string, listener: (event: unknown) => void) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: unknown) => void) =>
        listeners.delete(listener),
    } as unknown as MediaQueryList;
    entries.push({ query, list, listeners });
    return list;
  });

  return {
    queries: () => entries.map((entry) => entry.query),
    update(change: Partial<Environment>): void {
      Object.assign(environment, change);
      for (const entry of entries) {
        for (const listener of [...entry.listeners]) {
          listener({ matches: entry.list.matches, media: entry.query });
        }
      }
    },
  };
}

describe('CkMedia', () => {
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  it('reports the initial environment', () => {
    fakeMatchMedia({ width: 400, coarse: true, reducedMotion: true });
    const media = TestBed.inject(CkMedia);
    expect(media.coarsePointer()).toBe(true);
    expect(media.narrow()).toBe(true);
    expect(media.reducedMotion()).toBe(true);
    expect(media.sheet()).toBe(true);
  });

  it('follows viewport resizes across the default 640 px breakpoint', async () => {
    const environment = fakeMatchMedia({ width: 800, coarse: false, reducedMotion: false });
    const media = TestBed.inject(CkMedia);
    expect(media.narrow()).toBe(false);
    environment.update({ width: 639 });
    await settle();
    expect(media.narrow()).toBe(true);
    environment.update({ width: 640 });
    await settle();
    expect(media.narrow()).toBe(false);
  });

  it('needs both a coarse pointer and a narrow viewport for sheet', async () => {
    const environment = fakeMatchMedia({ width: 400, coarse: false, reducedMotion: false });
    const media = TestBed.inject(CkMedia);
    expect(media.narrow()).toBe(true);
    expect(media.sheet()).toBe(false);
    environment.update({ coarse: true });
    await settle();
    expect(media.sheet()).toBe(true);
    environment.update({ width: 1200 });
    await settle();
    expect(media.coarsePointer()).toBe(true);
    expect(media.sheet()).toBe(false);
  });

  it('tracks the reduced-motion preference', async () => {
    const environment = fakeMatchMedia({ width: 800, coarse: false, reducedMotion: false });
    const media = TestBed.inject(CkMedia);
    expect(media.reducedMotion()).toBe(false);
    environment.update({ reducedMotion: true });
    await settle();
    expect(media.reducedMotion()).toBe(true);
  });

  it('uses the configured sheetBreakpoint', async () => {
    const environment = fakeMatchMedia({ width: 700, coarse: true, reducedMotion: false });
    TestBed.configureTestingModule({ providers: [provideCkui({ sheetBreakpoint: 720 })] });
    const media = TestBed.inject(CkMedia);
    expect(environment.queries().some((query) => query.includes('719.98px'))).toBe(true);
    expect(media.narrow()).toBe(true);
    expect(media.sheet()).toBe(true);
    environment.update({ width: 720 });
    await settle();
    expect(media.narrow()).toBe(false);
  });

  describe('with the real viewport', () => {
    afterEach(async () => {
      await page.viewport(800, 600);
    });

    it('flips narrow when the viewport crosses the breakpoint', async () => {
      await page.viewport(900, 600);
      const media = TestBed.inject(CkMedia);
      expect(media.narrow()).toBe(false);
      await page.viewport(500, 600);
      await settle();
      expect(media.narrow()).toBe(true);
      await page.viewport(640, 600);
      await settle();
      expect(media.narrow()).toBe(false);
      await page.viewport(639, 600);
      await settle();
      expect(media.narrow()).toBe(true);
    });
  });

  it('keeps every signal false on the server', () => {
    const environment = fakeMatchMedia({ width: 100, coarse: true, reducedMotion: true });
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const media = TestBed.inject(CkMedia);
    expect(media.coarsePointer()).toBe(false);
    expect(media.narrow()).toBe(false);
    expect(media.reducedMotion()).toBe(false);
    expect(media.sheet()).toBe(false);
    expect(environment.queries()).toEqual([]);
  });
});
