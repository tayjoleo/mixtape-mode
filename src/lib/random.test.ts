import { describe, expect, it } from 'vitest';
import { randomString } from './random';

describe('randomString', () => {
  it('returns the requested length', () => {
    expect(randomString(43)).toHaveLength(43);
    expect(randomString(128)).toHaveLength(128);
  });

  it('uses only characters the PKCE standard allows in a verifier', () => {
    expect(randomString(512)).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('does not repeat itself', () => {
    const seen = new Set(Array.from({ length: 50 }, () => randomString(32)));
    expect(seen.size).toBe(50);
  });
});
