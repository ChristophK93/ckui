import { CkError, CkHint } from '@ckui/core/form';
import { CkCheckbox } from './checkbox';
import { CkCheckboxGroup } from './checkbox-group';

export { CkCheckbox } from './checkbox';
export { CkCheckboxGroup } from './checkbox-group';

/** Everything a template needs for checkboxes: `imports: [CK_CHECKBOX_IMPORTS]`. */
export const CK_CHECKBOX_IMPORTS = [CkCheckbox, CkCheckboxGroup, CkHint, CkError] as const;
