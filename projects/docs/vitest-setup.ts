import { afterEach, vi } from 'vitest';
import { cdp } from 'vitest/browser';

interface Session {
  send(method: string, params: unknown): Promise<unknown>;
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  // Spec files share one window: a pointer left where a test clicked would hover whatever the
  // next test renders there and start its hover transition. Park it in the bottom-right corner.
  await (cdp() as unknown as Session).send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: Math.max(0, window.innerWidth - 1),
    y: Math.max(0, window.innerHeight - 1),
  });
});
