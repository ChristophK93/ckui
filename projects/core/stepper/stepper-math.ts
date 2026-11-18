/** What the stepper needs to snap, clamp and format: all numbers already validated. */
export interface StepperGrid {
  readonly step: number;
  readonly min: number | null;
  readonly max: number | null;
  readonly digits: number;
}

export interface StepperSeparators {
  readonly decimal: string;
  readonly group: string;
}

const MAX_DIGITS = 10;
const EPSILON = 1e-9;
/** Larger typed values are treated as a typo and reverted. */
const LIMIT = 1e15;

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
export function snap(value: number, grid: StepperGrid): number {
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
export function adjacent(value: number, direction: 1 | -1, grid: StepperGrid): number {
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
export function moveBy(value: number, direction: 1 | -1, count: number, grid: StepperGrid): number {
  const first = adjacent(value, direction, grid);
  return count <= 1 ? first : snap(first + direction * (count - 1) * grid.step, grid);
}

/** Arabic-Indic and Persian digits and marks to ASCII, as `Intl` writes numbers in ar and fa. */
function toAscii(text: string): string {
  return text
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\u066b/g, '.')
    .replace(/\u066c/g, ',')
    .replace(/[\u061c\u200e\u200f]/g, '');
}

export function separatorsOf(locale: string): StepperSeparators {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(1000000.5);
    return {
      decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
      group: parts.find((part) => part.type === 'group')?.value ?? ',',
    };
  } catch {
    return { decimal: '.', group: ',' };
  }
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

/**
 * Reads what a person typed. `null` is an empty field, `undefined` something that is no number.
 * Both `.` and `,` count as a decimal mark; a mark that is the locale's group separator and sits
 * in groups of three (`1.250` in German) is a group separator.
 */
export function parseNumber(
  text: string,
  separators: StepperSeparators,
): number | null | undefined {
  const groupMark = toAscii(separators.group);
  let cleaned = toAscii(text)
    .replace(/[\s'’]/g, '')
    .replace(/[−‒–]/g, '-');
  if (cleaned === '') {
    return null;
  }
  const dots = cleaned.split('.').length - 1;
  const commas = cleaned.split(',').length - 1;
  if (dots > 0 && commas > 0) {
    const decimalMark = cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',') ? '.' : ',';
    const groupMark = decimalMark === '.' ? ',' : '.';
    cleaned = cleaned.split(groupMark).join('').replace(decimalMark, '.');
  } else if (dots + commas > 0) {
    const mark = dots > 0 ? '.' : ',';
    const count = Math.max(dots, commas);
    const grouped = /^[+-]?[1-9]\d{0,2}([.,]\d{3})+$/.test(cleaned);
    if (count > 1 || (grouped && groupMark === mark)) {
      if (!grouped) {
        return undefined;
      }
      cleaned = cleaned.split(mark).join('');
    } else {
      cleaned = cleaned.replace(mark, '.');
    }
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) {
    return undefined;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && Math.abs(parsed) <= LIMIT ? parsed : undefined;
}
