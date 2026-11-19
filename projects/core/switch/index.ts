import { CkSwitch } from './switch';
import { CkSwitchHint } from './switch-hint';

export { CkSwitch } from './switch';
export { CkSwitchHint } from './switch-hint';

/** Everything a template needs for a switch: `imports: [CK_SWITCH_IMPORTS]`. */
export const CK_SWITCH_IMPORTS = [CkSwitch, CkSwitchHint] as const;
