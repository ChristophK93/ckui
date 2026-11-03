import { createCkId } from './id';

function counterOf(id: string): number {
  return Number(id.split('-').pop());
}

describe('createCkId', () => {
  it('prefixes the id and increments the counter', () => {
    const first = createCkId('ck-field');
    const second = createCkId('ck-field');
    expect(first).toMatch(/^ck-field-\d+$/);
    expect(counterOf(second)).toBe(counterOf(first) + 1);
  });

  it('returns unique ids over many calls and across prefixes', () => {
    const ids = new Set<string>();
    for (let index = 0; index < 5000; index++) {
      ids.add(createCkId(index % 2 === 0 ? 'ck-a' : 'ck-b'));
    }
    expect(ids.size).toBe(5000);
  });

  it('throws a TypeError for an empty or whitespace-only prefix', () => {
    expect(() => createCkId('')).toThrow(TypeError);
    expect(() => createCkId('   ')).toThrow(TypeError);
    expect(() => createCkId('\t\n')).toThrow(TypeError);
  });

  it('throws a TypeError for non-string prefixes passed past the type system', () => {
    for (const bad of [undefined, null, 5, {}, ['a']]) {
      expect(() => createCkId(bad as unknown as string)).toThrow(TypeError);
    }
  });

  it('does not consume a counter value when it throws', () => {
    const before = counterOf(createCkId('probe'));
    expect(() => createCkId('')).toThrow();
    expect(counterOf(createCkId('probe'))).toBe(before + 1);
  });

  it('keeps prefixes containing dashes intact and ids distinct', () => {
    const dashed = createCkId('ck-a-b');
    expect(dashed.startsWith('ck-a-b-')).toBe(true);
    expect(createCkId('ck-a-b')).not.toBe(dashed);
    expect(createCkId('x-1')).not.toBe(createCkId('x'));
  });
});
