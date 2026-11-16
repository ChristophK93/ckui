import { CkSegment } from './segment';
import { CkSegmented } from './segmented';

export { CkSegment } from './segment';
export { CkSegmented } from './segmented';

/** Everything a template needs for a segmented control: `imports: [CK_SEGMENTED_IMPORTS]`. */
export const CK_SEGMENTED_IMPORTS = [CkSegmented, CkSegment] as const;
