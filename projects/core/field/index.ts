import { CkPrefix, CkSuffix } from './affix';
import { CkError } from './error';
import { CkField } from './field';
import { CkHint } from './hint';
import { CkInput } from './input';

export { CkPrefix, CkSuffix } from './affix';
export { CkError } from './error';
export { CkField } from './field';
export { CkHint } from './hint';
export { CkInput } from './input';

/** Everything a template needs for a field: `imports: [CK_FIELD_IMPORTS]`. */
export const CK_FIELD_IMPORTS = [CkField, CkInput, CkHint, CkError, CkPrefix, CkSuffix] as const;
