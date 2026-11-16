import { InjectionToken, Signal } from '@angular/core';

/** The part of a `ck-segment` its group reads, so the two files need not import each other's classes. */
export interface CkSegmentRef {
  readonly element: HTMLElement;
  readonly value: () => unknown;
  readonly unavailable: Signal<boolean>;
}

/** What a `ck-segment` needs from its group. */
export interface CkSegmentedContext {
  /** The group is disabled by its input or by the forms API. */
  readonly groupDisabled: Signal<boolean>;
  /** The group's one tab stop, or `null` when nothing can take focus. */
  readonly tabStop: Signal<CkSegmentRef | null>;
  isChecked(value: unknown): boolean;
  select(segment: CkSegmentRef): void;
}

export const CK_SEGMENTED_CONTEXT = new InjectionToken<CkSegmentedContext>('CK_SEGMENTED_CONTEXT');
