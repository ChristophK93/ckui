import {
  NumberGrid,
  adjacent,
  createFormatter,
  decimalsOf,
  finiteOrNull,
  moveBy,
  roundTo,
  snap,
  toNumber,
} from './number-grid';

const grid = (overrides: Partial<NumberGrid> = {}): NumberGrid => ({
  step: 1,
  min: 0,
  max: 100,
  digits: 0,
  ...overrides,
});

describe('number grid', () => {
  it('reads numbers from attributes and drops everything else', () => {
    expect([toNumber(5), toNumber('5'), toNumber(null), toNumber(undefined), toNumber('')]).toEqual(
      [5, 5, null, null, null],
    );
    expect(toNumber('abc')).toBeNaN();
    expect(toNumber({})).toBeNaN();
    expect([
      finiteOrNull(3),
      finiteOrNull(null),
      finiteOrNull(NaN),
      finiteOrNull(Infinity),
    ]).toEqual([3, null, null, null]);
  });

  it('counts the fraction digits as written', () => {
    expect([decimalsOf(1), decimalsOf(0.25), decimalsOf(1e-7), decimalsOf(NaN)]).toEqual([
      0, 2, 7, 0,
    ]);
    expect(decimalsOf(1e-20)).toBe(10);
  });

  it('rounds away binary drift and never returns -0', () => {
    expect(roundTo(0.1 + 0.2, 1)).toBe(0.3);
    expect(Object.is(roundTo(-0.0000001, 2), 0)).toBe(true);
  });

  it('snaps to the grid from min, inside the bounds', () => {
    const half = grid({ step: 0.5, min: -2, max: 12, digits: 1 });
    expect(snap(0.26, half)).toBe(0.5);
    expect(snap(99, half)).toBe(12);
    expect(snap(-99, half)).toBe(-2);
    expect(snap(0.2 + 0.1, grid({ step: 0.1, min: 0, max: 1, digits: 1 }))).toBe(0.3);
  });

  it('keeps a max that is off the grid out of reach', () => {
    expect(snap(10, grid({ step: 3, min: 0, max: 10 }))).toBe(9);
  });

  it('lets min win when it is above max', () => {
    expect(snap(5, grid({ min: 10, max: 2 }))).toBe(10);
  });

  it('moves from an off-grid value to the adjacent grid point', () => {
    const tenths = grid({ step: 0.5, digits: 1 });
    expect(adjacent(3.2, 1, tenths)).toBe(3.5);
    expect(adjacent(3.2, -1, tenths)).toBe(3);
    expect(adjacent(3.5, 1, tenths)).toBe(4);
    expect(moveBy(3.2, 1, 3, tenths)).toBe(4.5);
  });

  it('formats with fixed fraction digits and falls back for a bad locale', () => {
    expect(createFormatter('en', 1, 1).format(2)).toBe('2.0');
    expect(createFormatter('not a locale!', 0, 0).format(1234)).toBe('1234');
  });
});
