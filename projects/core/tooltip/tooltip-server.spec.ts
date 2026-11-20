import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CkTooltip } from '@ckui/core/tooltip';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bubbles, cleanUp, layer, mount, pointer, press, settle } from '../testing/tooltip-host';

describe('CkTooltip on the server', () => {
  afterEach(() => {
    cleanUp();
  });

  it('renders the host untouched and creates no layer, bubble or description', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const { fixture, root } = mount(
      `<button ckButton aria-label="Rest timer" aria-describedby="hint" ckTooltip="Hi">Rest</button>`,
    );
    await settle(fixture);
    const host = root.querySelector('button')!;
    expect(host.getAttribute('aria-describedby')).toBe('hint');
    expect(Array.from(host.attributes).some((a) => a.name.startsWith('data-ck-claim'))).toBe(false);
    expect(layer()).toBeNull();
    expect(bubbles()).toHaveLength(0);
  });

  it('shows nothing and sets no timer for hover, focus, long-press, Escape or show()', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const { fixture, root } = mount(
      `<button ckButton aria-label="Rest timer" ckTooltip="Hi">Rest</button>`,
    );
    await settle(fixture);
    const host = root.querySelector('button')!;
    const tooltip = fixture.debugElement.query(By.directive(CkTooltip)).injector.get(CkTooltip);
    const show = vi.spyOn(HTMLElement.prototype, 'showPopover');
    pointer(host, 'pointerenter');
    pointer(host, 'pointerdown', { pointerType: 'touch' });
    host.focus();
    vi.advanceTimersByTime(5000);
    tooltip.show();
    press(host, 'Escape');
    tooltip.hide();
    expect(show).not.toHaveBeenCalled();
    expect(tooltip.isVisible()).toBe(false);
    expect(layer()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    fixture.destroy();
    expect(host.getAttribute('aria-describedby')).toBeNull();
  });

  it('shows no dev warning for a host without a name, which only the browser can check', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const { fixture } = mount(`<button ckButton ckTooltip="Hi"></button>`);
    await settle(fixture);
    expect(warn).not.toHaveBeenCalled();
  });
});
