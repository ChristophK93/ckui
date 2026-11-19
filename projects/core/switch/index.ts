import { CkHint } from '@ckui/core/form';
import { CkSwitch } from './switch';

export { CkSwitch } from './switch';

/** Everything a template needs for a switch: `imports: [CK_SWITCH_IMPORTS]`. */
export const CK_SWITCH_IMPORTS = [CkSwitch, CkHint] as const;
