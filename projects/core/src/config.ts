import {
  EnvironmentProviders,
  InjectionToken,
  Provider,
  Signal,
  computed,
  isSignal,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';
import { CK_LABELS, CkLabels, resolveCkLabels } from './labels';
import { CK_SIZES, CkSize } from './size';

export interface CkConfig {
  readonly size: CkSize;
  /** Viewport width in px below which a coarse pointer switches overlays to sheets. */
  readonly sheetBreakpoint: number;
}

export const CK_DEFAULT_CONFIG: Readonly<CkConfig> = Object.freeze({
  size: 'md',
  sheetBreakpoint: 640,
});

export const CK_CONFIG = new InjectionToken<CkConfig>('CK_CONFIG', {
  providedIn: 'root',
  factory: () => ({ ...CK_DEFAULT_CONFIG }),
});

export interface CkOptions {
  size?: CkSize;
  /** In px; finite and greater than 0. */
  sheetBreakpoint?: number;
  /** A partial object, a signal of one, or a factory (runs in injection context) returning a signal of one. */
  labels?: Partial<CkLabels> | Signal<Partial<CkLabels>> | (() => Signal<Partial<CkLabels>>);
}

function labelsProvider(labels: NonNullable<CkOptions['labels']>): Provider {
  if (isSignal(labels)) {
    return { provide: CK_LABELS, useValue: computed(() => resolveCkLabels(labels())) };
  }
  if (typeof labels === 'function') {
    return {
      provide: CK_LABELS,
      useFactory: (): Signal<CkLabels> => {
        const source = labels();
        if (!isSignal(source)) {
          throw new TypeError('provideCkui: the labels factory must return a signal.');
        }
        return computed(() => resolveCkLabels(source()));
      },
    };
  }
  if (typeof labels !== 'object' || labels === null) {
    throw new TypeError('provideCkui: labels must be an object or a factory returning a signal.');
  }
  return { provide: CK_LABELS, useValue: signal(resolveCkLabels(labels)).asReadonly() };
}

/** Configures size, sheet breakpoint and built-in strings for the whole app. */
export function provideCkui(options: CkOptions = {}): EnvironmentProviders {
  const size = options.size ?? CK_DEFAULT_CONFIG.size;
  const sheetBreakpoint = options.sheetBreakpoint ?? CK_DEFAULT_CONFIG.sheetBreakpoint;
  if (!CK_SIZES.includes(size)) {
    throw new TypeError(`provideCkui: size must be one of ${CK_SIZES.join(', ')}, got "${size}".`);
  }
  if (
    typeof sheetBreakpoint !== 'number' ||
    !Number.isFinite(sheetBreakpoint) ||
    sheetBreakpoint <= 0
  ) {
    throw new TypeError(
      `provideCkui: sheetBreakpoint must be a finite number greater than 0, got ${String(sheetBreakpoint)}.`,
    );
  }
  const providers: Provider[] = [{ provide: CK_CONFIG, useValue: { size, sheetBreakpoint } }];
  if (options.labels !== undefined) {
    providers.push(labelsProvider(options.labels));
  }
  return makeEnvironmentProviders(providers);
}
