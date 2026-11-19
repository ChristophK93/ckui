import { CkTab } from './tab';
import { CkTabContent } from './tab-content';
import { CkTabList } from './tab-list';
import { CkTabPanel } from './tab-panel';
import { CkTabs } from './tabs';

export { CkTab } from './tab';
export { CkTabContent } from './tab-content';
export { CkTabList } from './tab-list';
export { CkTabPanel } from './tab-panel';
export { CkTabs } from './tabs';
export type { CkTabsActivation } from './context';

/** Everything a template needs for tabs: `imports: [CK_TABS_IMPORTS]`. */
export const CK_TABS_IMPORTS = [CkTabs, CkTabList, CkTab, CkTabPanel, CkTabContent] as const;
