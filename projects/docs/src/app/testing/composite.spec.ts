import { compositeOver } from './composite';

describe('compositeOver', () => {
  it('returns the overlay when it is opaque', () => {
    expect(compositeOver('rgb(10, 20, 30)', 'rgb(200, 200, 200)')).toBe('rgb(10, 20, 30)');
  });

  it('returns the base when the overlay is fully transparent', () => {
    expect(compositeOver('rgba(0, 0, 0, 0)', 'rgb(200, 100, 50)')).toBe('rgb(200, 100, 50)');
  });

  it('blends half-transparent black over white to mid grey', () => {
    const [red] = compositeOver('rgba(0, 0, 0, 0.5)', 'rgb(255, 255, 255)')
      .match(/\d+/g)!
      .map(Number);
    expect(red).toBeGreaterThanOrEqual(126);
    expect(red).toBeLessThanOrEqual(129);
  });

  it('understands color-mix overlays and does not leak the previous call', () => {
    compositeOver('rgb(255, 0, 0)', 'rgb(0, 0, 255)');
    const mixed = compositeOver('color-mix(in oklch, black 50%, transparent)', 'white');
    expect(mixed).not.toBe('rgb(255, 255, 255)');
    expect(mixed).not.toContain('255, 0');
  });

  it('rejects an invalid colour', () => {
    expect(() => compositeOver('not-a-colour', 'white')).toThrow();
  });
});
