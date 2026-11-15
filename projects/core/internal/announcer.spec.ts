import { TestBed } from '@angular/core/testing';
import { CkAnnouncer } from './announcer';

function liveRegion(): HTMLElement | null {
  return document.body.querySelector('.cdk-live-announcer-element');
}

describe('CkAnnouncer', () => {
  afterEach(() => {
    TestBed.inject(CkAnnouncer).clear();
    TestBed.resetTestingModule();
    document.body.querySelectorAll('.cdk-live-announcer-element').forEach((node) => node.remove());
  });

  it('writes a polite message into the live region by default', async () => {
    await TestBed.inject(CkAnnouncer).announce('3 results');
    const region = liveRegion();
    expect(region?.textContent).toBe('3 results');
    expect(region?.getAttribute('aria-live')).toBe('polite');
  });

  it('switches the live region to assertive', async () => {
    await TestBed.inject(CkAnnouncer).announce('Connection lost', 'assertive');
    const region = liveRegion();
    expect(region?.textContent).toBe('Connection lost');
    expect(region?.getAttribute('aria-live')).toBe('assertive');
  });

  it('treats blank, whitespace and non-string messages as a no-op', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    for (const bad of ['', '   ', '\n\t', null, undefined, 5]) {
      await expect(announcer.announce(bad as unknown as string)).resolves.toBeUndefined();
    }
    expect(liveRegion()?.textContent ?? '').toBe('');
  });

  it('does not wipe the previous message when a blank one follows', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    await announcer.announce('Saved');
    await announcer.announce('  ');
    expect(liveRegion()?.textContent).toBe('Saved');
  });

  it('clears the live region', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    await announcer.announce('Saved');
    announcer.clear();
    expect(liveRegion()?.textContent).toBe('');
  });

  it('announces repeated identical messages without throwing', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    await announcer.announce('Again');
    await announcer.announce('Again');
    expect(liveRegion()?.textContent).toBe('Again');
  });
});
