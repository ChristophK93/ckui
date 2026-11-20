import { CkTooltip } from './tooltip';

export { CkTooltip } from './tooltip';
export type { CkTooltipPosition } from './tooltip';

/** Everything a template needs for a tooltip: `imports: [CK_TOOLTIP_IMPORTS]`. */
export const CK_TOOLTIP_IMPORTS = [CkTooltip] as const;
