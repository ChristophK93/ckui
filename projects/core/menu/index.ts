import { CkMenu } from './menu';
import { CkMenuDivider } from './menu-divider';
import { CkMenuItem } from './menu-item';
import { CkMenuItemIcon } from './menu-item-icon';
import { CkMenuTrigger } from './menu-trigger';

export { CkMenu } from './menu';
export { CkMenuDivider } from './menu-divider';
export { CkMenuItem } from './menu-item';
export type { CkMenuItemTone } from './menu-item';
export { CkMenuItemIcon } from './menu-item-icon';
export { CkMenuTrigger } from './menu-trigger';

/** Everything a template needs for a menu: `imports: [CK_MENU_IMPORTS]`. */
export const CK_MENU_IMPORTS = [
  CkMenuTrigger,
  CkMenu,
  CkMenuItem,
  CkMenuItemIcon,
  CkMenuDivider,
] as const;
