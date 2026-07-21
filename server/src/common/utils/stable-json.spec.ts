import { stableStringify } from './stable-json';

describe('stableStringify', () => {
  it('sorts object keys and preserves bigint precision', () => {
    expect(stableStringify({ z: 1n, a: 'first' })).toBe('{"a":"first","z":"1"}');
    expect(stableStringify({ a: 'first', z: 1n })).toBe('{"a":"first","z":"1"}');
  });
});
