import { CkError, CkHint } from '@ckui/core/form';
import { CkRadio } from './radio';
import { CkRadioGroup } from './radio-group';

export { CkRadio } from './radio';
export { CkRadioGroup } from './radio-group';

/** Everything a template needs for a radio group: `imports: [CK_RADIO_IMPORTS]`. */
export const CK_RADIO_IMPORTS = [CkRadioGroup, CkRadio, CkHint, CkError] as const;
