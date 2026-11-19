import { InjectionToken } from '@angular/core';

/** What `ck-option` and `ck-optgroup` ask of the `ck-select` they sit in. Not public API. */
export interface CkSelectContext {
  isSelected(option: object): boolean;
  isActive(option: object): boolean;
  isVisible(option: object): boolean;
  choose(option: object): void;
}

export const CK_SELECT = new InjectionToken<CkSelectContext>('CK_SELECT');

/** What `ck-option` asks of the `ck-optgroup` around it. Not public API. */
export interface CkOptgroupContext {
  readonly disabled: () => boolean;
}

export const CK_OPTGROUP = new InjectionToken<CkOptgroupContext>('CK_OPTGROUP');
