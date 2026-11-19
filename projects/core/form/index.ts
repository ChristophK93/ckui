import { CkError } from './error';
import { CkHint } from './hint';

export { CkError } from './error';
export { CkHint } from './hint';

/** Hint and error messages for a form control: `imports: [CK_FORM_MESSAGE_IMPORTS]`. */
export const CK_FORM_MESSAGE_IMPORTS = [CkHint, CkError] as const;
