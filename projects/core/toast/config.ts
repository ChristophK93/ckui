import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { CK_SIZES, CkSize } from '@ckui/core';

export type CkToastPosition = 'top' | 'bottom';
export type CkToastAlign = 'center' | 'end';

export interface CkToastConfig {
  /** Screen edge the toasts stack against. Default `bottom`. */
  position?: CkToastPosition;
  /** Default `center` on a narrow viewport and `end` otherwise, decided each time the stack is laid out. */
  align?: CkToastAlign;
  /** Toasts shown at once; later ones wait until a slot frees. A positive whole number, default 3. */
  max?: number;
  /** Size of the action and dismiss buttons. Default: the size from `provideCkui`. */
  size?: CkSize;
}

export const DEFAULT_MAX = 3;

/** The resolved options; `undefined` means "decide when the toast is shown". */
export const CK_TOAST_CONFIG = new InjectionToken<CkToastConfig>('CK_TOAST_CONFIG', {
  providedIn: 'root',
  factory: () => ({}),
});

/** Configures where toasts appear, how many show at once and the size of their buttons. */
export function provideCkToast(config: CkToastConfig = {}): EnvironmentProviders {
  const { position, align, max, size } = config;
  if (position !== undefined && position !== 'top' && position !== 'bottom') {
    throw new TypeError(`provideCkToast: position must be "top" or "bottom", got "${position}".`);
  }
  if (align !== undefined && align !== 'center' && align !== 'end') {
    throw new TypeError(`provideCkToast: align must be "center" or "end", got "${align}".`);
  }
  if (max !== undefined && (typeof max !== 'number' || !Number.isInteger(max) || max < 1)) {
    throw new TypeError(
      `provideCkToast: max must be a whole number of at least 1, got ${String(max)}.`,
    );
  }
  if (size !== undefined && !CK_SIZES.includes(size)) {
    throw new TypeError(
      `provideCkToast: size must be one of ${CK_SIZES.join(', ')}, got "${size}".`,
    );
  }
  return makeEnvironmentProviders([
    { provide: CK_TOAST_CONFIG, useValue: { position, align, max, size } satisfies CkToastConfig },
  ]);
}
