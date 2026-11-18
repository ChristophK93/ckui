import { CkBadge, CkBadgeIcon } from './badge';

export type { CkBadgeSize, CkBadgeTone } from './badge';
export { CkBadge, CkBadgeIcon } from './badge';

/** Everything a template needs for a badge: `imports: [CK_BADGE_IMPORTS]`. */
export const CK_BADGE_IMPORTS = [CkBadge, CkBadgeIcon] as const;
