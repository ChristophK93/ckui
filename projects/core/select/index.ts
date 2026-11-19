import { CkOptgroup } from './optgroup';
import { CkOption } from './option';
import { CkSelect } from './select';
import { CkSelectValue } from './select-value';

export { CkOptgroup } from './optgroup';
export { CkOption } from './option';
export { CkSelect } from './select';
export { CkSelectValue } from './select-value';
export type { CkSelectValueContext, CkSelectedOption } from './select-value';

/** Everything a template needs for a select: `imports: [CK_SELECT_IMPORTS]`. */
export const CK_SELECT_IMPORTS = [CkSelect, CkOption, CkOptgroup, CkSelectValue] as const;
