import { CkError, CkHint } from '@ckui/core/form';
import { CkPrefix, CkSuffix } from './affix';
import { CkField } from './field';
import { CkInput } from './input';

export { CkError, CkHint } from '@ckui/core/form';
export { CkPrefix, CkSuffix } from './affix';
export { CkField } from './field';
export { CkInput } from './input';

/** Everything a template needs for a field: `imports: [CK_FIELD_IMPORTS]`. */
export const CK_FIELD_IMPORTS = [CkField, CkInput, CkHint, CkError, CkPrefix, CkSuffix] as const;
