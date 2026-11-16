import { TestBed } from '@angular/core/testing';
import { CkAnnouncer } from './announcer';

function liveRegion(): HTMLElement | null {
  return document.body.querySelector('.cdk-live-announcer-element');
}

const pause = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

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

  it('hides the live region visually with the CDK styles it loads itself, without any other CSS', async () => {
    await TestBed.inject(CkAnnouncer).announce('x '.repeat(400));
    const region = liveRegion()!;
    const style = getComputedStyle(region);
    expect(style.position).toBe('absolute');
    expect(style.width).toBe('1px');
    expect(style.height).toBe('1px');
    expect(style.overflow).toBe('hidden');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    expect(region.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });

  it('speaks several announcements of one tick together, in order', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    const done = [
      announcer.announce('Saved'),
      announcer.announce('Uploaded.'),
      announcer.announce('Done'),
    ];
    await Promise.all(done);
    expect(liveRegion()?.textContent).toBe('Saved. Uploaded. Done');
    expect(liveRegion()?.getAttribute('aria-live')).toBe('polite');
  });

  it('is assertive when any announcement of the tick is, wherever it comes in the order', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    await Promise.all([
      announcer.announce('Upload failed', 'assertive'),
      announcer.announce('Saved'),
    ]);
    expect(liveRegion()?.textContent).toBe('Upload failed. Saved');
    expect(liveRegion()?.getAttribute('aria-live')).toBe('assertive');
    await Promise.all([
      announcer.announce('Saved'),
      announcer.announce('Upload failed', 'assertive'),
    ]);
    expect(liveRegion()?.getAttribute('aria-live')).toBe('assertive');
  });

  it('ignores blank messages among the batch and keeps later ticks separate', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    await Promise.all([
      announcer.announce('One'),
      announcer.announce('  '),
      announcer.announce('Two'),
    ]);
    expect(liveRegion()?.textContent).toBe('One. Two');
    await pause(200);
    await announcer.announce('Three');
    expect(liveRegion()?.textContent).toBe('Three');
    expect(liveRegion()?.getAttribute('aria-live')).toBe('polite');
  });

  it('drops announcements that were not written yet when cleared, and settles their promises', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    const pending = announcer.announce('Never heard');
    announcer.clear();
    await pending;
    await Promise.resolve();
    expect(liveRegion()?.textContent ?? '').toBe('');
  });

  it('speaks a message from a later tick together with the previous one while that may not be read out', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    void announcer.announce('Bike disconnected');
    await pause(20);
    await announcer.announce('Control error', 'assertive');
    expect(liveRegion()?.textContent).toBe('Bike disconnected. Control error');
    expect(liveRegion()?.getAttribute('aria-live')).toBe('assertive');
  });

  it('is assertive when only the earlier message was, and chains a third within the window', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    void announcer.announce('Failed', 'assertive');
    await pause(20);
    void announcer.announce('Saved');
    await pause(20);
    await announcer.announce('Done');
    expect(liveRegion()?.textContent).toBe('Failed. Saved. Done');
    expect(liveRegion()?.getAttribute('aria-live')).toBe('assertive');
  });

  it('writes only the new message after a pause, without a growing concatenation', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    await announcer.announce('First');
    await pause(500);
    await announcer.announce('Second');
    expect(liveRegion()?.textContent).toBe('Second');
    expect(liveRegion()?.getAttribute('aria-live')).toBe('polite');
    await pause(500);
    await announcer.announce('Third');
    expect(liveRegion()?.textContent).toBe('Third');
  });

  it('forgets the previous message when cleared', async () => {
    const announcer = TestBed.inject(CkAnnouncer);
    void announcer.announce('Old');
    await pause(20);
    announcer.clear();
    await announcer.announce('New');
    expect(liveRegion()?.textContent).toBe('New');
  });
});
