export interface StepperSeparators {
  readonly decimal: string;
  readonly group: string;
}

/** Larger typed values are treated as a typo and reverted. */
const LIMIT = 1e15;

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
