import { InjectionToken, Signal, signal } from '@angular/core';

/** Built-in strings. Each package adds its keys; consumers pass a `Partial`. */
export interface CkLabels {
  /** The last row of a menu on a phone; it closes the menu. */
  cancel: string;
  close: string;
  decrement: string;
  dismiss: string;
  increment: string;
  loading: string;
  noResults: string;
  notifications: string;
  /** Result count after filtering a list, for the plural categories other than `one`; `{count}` is replaced by the number. */
  resultCount: string;
  /** Result count where `Intl.PluralRules` for the locale says `one` (1 in English); `{count}` is replaced by the number. */
  resultCountOne: string;
  /** The name of a search field, after the name of what it searches ('Country Search'). */
  search: string;
}

export const CK_DEFAULT_LABELS: Readonly<CkLabels> = Object.freeze({
  cancel: 'Cancel',
  close: 'Close',
  decrement: 'Decrease',
  dismiss: 'Dismiss',
  increment: 'Increase',
  loading: 'Loading',
  noResults: 'No results',
  notifications: 'Notifications',
  resultCount: '{count} results',
  resultCountOne: '{count} result',
  search: 'Search',
});

/** Merges overrides onto the defaults. Blank and non-string values fall back; unknown keys are ignored. */
export function resolveCkLabels(overrides: unknown): CkLabels {
  const source = typeof overrides === 'object' && overrides !== null ? overrides : {};
  const resolved: CkLabels = { ...CK_DEFAULT_LABELS };
  for (const key of Object.keys(CK_DEFAULT_LABELS) as (keyof CkLabels)[]) {
    const value = Object.hasOwn(source, key) ? (source as Record<string, unknown>)[key] : undefined;
    if (typeof value === 'string' && value.trim() !== '') {
      resolved[key] = value;
    }
  }
  return resolved;
}

export const CK_LABELS = new InjectionToken<Signal<CkLabels>>('CK_LABELS', {
  providedIn: 'root',
  factory: () => signal<CkLabels>({ ...CK_DEFAULT_LABELS }).asReadonly(),
});
