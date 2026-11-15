import { contrastRatio, resolveToken } from './contrast';

describe('contrastRatio', () => {
  it('is 21 for black on white and symmetric', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
  });

  it('is 1 for identical colours', () => {
    expect(contrastRatio('rgb(10 20 30)', 'rgb(10 20 30)')).toBeCloseTo(1, 5);
  });

  it('resolves oklch and named colours', () => {
    expect(contrastRatio('oklch(1 0 0)', 'oklch(0 0 0)')).toBeCloseTo(21, 0);
    expect(contrastRatio('white', 'black')).toBeCloseTo(21, 1);
  });

  it('matches a known WCAG pair', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 1);
  });

  it('throws for an invalid colour and for a translucent one', () => {
    expect(() => contrastRatio('not-a-colour', '#fff')).toThrow(/valid CSS colour/);
    expect(() => contrastRatio('#fff', 'rgb(0 0 0 / 0.5)')).toThrow(/opaque/);
    expect(() => contrastRatio('', '#fff')).toThrow();
  });
});

describe('resolveToken', () => {
  it('reads and trims a custom property, resolving var() references', () => {
    const element = document.createElement('div');
    element.style.setProperty('--probe-base', '  rgb(1 2 3)  ');
    element.style.setProperty('--probe', 'var(--probe-base)');
    document.body.appendChild(element);
    expect(resolveToken(element, '--probe')).toBe('rgb(1 2 3)');
    element.remove();
  });

  it('returns an empty string for an undeclared token', () => {
    expect(resolveToken(document.body, '--ck-does-not-exist')).toBe('');
  });
});
