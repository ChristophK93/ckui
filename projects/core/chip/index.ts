import { CkChip, CkChipIcon } from './chip';
import { CkChipGroup } from './chip-group';

export type { CkChipSize } from './chip';
export { CkChip, CkChipIcon } from './chip';
export { CkChipGroup } from './chip-group';

/** Everything a template needs for chips: `imports: [CK_CHIP_IMPORTS]`. */
export const CK_CHIP_IMPORTS = [CkChip, CkChipIcon, CkChipGroup] as const;
