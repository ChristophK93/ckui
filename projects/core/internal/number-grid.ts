/** What snapping, clamping and formatting need: all numbers already validated. */
export interface NumberGrid {
  readonly step: number;
  readonly min: number | null;
  readonly max: number | null;
  readonly digits: number;
}

const MAX_DIGITS = 10;
const EPSILON = 1e-9;

/** Accepts `50`, `'50'`, `null`, `undefined` and `''`; anything else that is no number is `NaN`. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
}

export const finiteOrNull = (value: number | null): number | null =>
  value !== null && Number.isFinite(value) ? value : null;

/** Fraction digits of a number as written, `0.25` → 2, `1e-7` → 7. */
export function decimalsOf(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const [mantissa, exponent] = String(Math.abs(value)).split('e');
  const fraction = mantissa.split('.')[1]?.length ?? 0;
  const shift = exponent === undefined ? 0 : -Number(exponent);
  return Math.min(Math.max(fraction + shift, 0), MAX_DIGITS);
}

/** Rounds to `digits` fraction digits, so 0.1 + 0.2 becomes 0.3, and never returns -0. */
export function roundTo(value: number, digits: number): number {
  const rounded = Number(value.toFixed(Math.min(digits, MAX_DIGITS)));
  return rounded === 0 ? 0 : rounded;
}

/** The nearest grid point inside the bounds. When `min` is above `max`, `min` wins. */
export function snap(value: number, grid: NumberGrid): number {
  const { step, min, max, digits } = grid;
  const base = min ?? 0;
  if (min !== null && max !== null && min > max) {
    return roundTo(min, digits);
  }
  let count = Math.round((value - base) / step);
  if (max !== null && base + count * step > max + EPSILON) {
    count = Math.floor((max - base) / step + EPSILON);
  }
  let snapped = base + count * step;
  if (min !== null && snapped < min) {
    snapped = min;
  }
  return roundTo(snapped, digits);
}

/** The first grid point beyond `value` in the direction; a value on the grid moves by one step. */
export function adjacent(value: number, direction: 1 | -1, grid: NumberGrid): number {
  const base = grid.min ?? 0;
  const position = (value - base) / grid.step;
  const nearest = Math.round(position);
  const onGrid = Math.abs(position - nearest) < EPSILON;
  let count: number;
  if (direction > 0) {
    count = onGrid ? nearest + 1 : Math.ceil(position);
  } else {
    count = onGrid ? nearest - 1 : Math.floor(position);
  }
  return snap(base + count * grid.step, grid);
}

/** `count` steps from the value; an off-grid value first moves to the adjacent grid point. */
export function moveBy(value: number, direction: 1 | -1, count: number, grid: NumberGrid): number {
  const first = adjacent(value, direction, grid);
  return count <= 1 ? first : snap(first + direction * (count - 1) * grid.step, grid);
}

export function createFormatter(
  locale: string,
  minDigits: number,
  maxDigits: number,
): Intl.NumberFormat {
  const options = {
    useGrouping: false,
    minimumFractionDigits: minDigits,
    maximumFractionDigits: Math.max(minDigits, maxDigits),
  };
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return new Intl.NumberFormat('en', options);
  }
}
