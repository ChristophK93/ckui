let counter = 0;

/** Returns an id that is unique within the running page, e.g. `ck-field-3`. */
export function createCkId(prefix: string): string {
  if (typeof prefix !== 'string' || prefix.trim() === '') {
    throw new TypeError('createCkId needs a non-empty prefix string.');
  }
  counter += 1;
  return `${prefix}-${counter}`;
}
