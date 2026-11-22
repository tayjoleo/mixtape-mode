import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearTokens,
  EXPIRY_SKEW_MS,
  expiryFromNow,
  isExpired,
  readTokens,
  writeTokens,
  type Tokens,
} from './tokens';

/** Minimal localStorage so these pure-ish functions can be tested in node. */
function installStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  globalThis.localStorage = storage as unknown as Storage;
  return store;
}

const valid: Tokens = { accessToken: 'a', refreshToken: 'r', expiresAt: 1000 };

beforeEach(() => {
  installStorage();
});

describe('readTokens', () => {
  it('round trips what writeTokens stored', () => {
    writeTokens(valid);
    expect(readTokens()).toEqual(valid);
  });

  it('returns null when nothing is stored', () => {
    expect(readTokens()).toBeNull();
  });

  it('returns null for unparseable JSON instead of throwing', () => {
    installStorage({ 'mm.tokens': 'not json {' });
    expect(readTokens()).toBeNull();
  });

  it.each([
    ['missing refresh token', { accessToken: 'a', expiresAt: 1 }],
    ['empty access token', { accessToken: '', refreshToken: 'r', expiresAt: 1 }],
    ['expiry is a string', { accessToken: 'a', refreshToken: 'r', expiresAt: 'soon' }],
    ['not an object', 'a-bare-string'],
    ['null', null],
  ])('returns null for %s', (_label, stored) => {
    installStorage({ 'mm.tokens': JSON.stringify(stored) });
    expect(readTokens()).toBeNull();
  });

  it('survives storage that throws', () => {
    globalThis.localStorage = {
      getItem() {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(readTokens()).toBeNull();
  });
});

describe('clearTokens', () => {
  it('removes the stored tokens', () => {
    writeTokens(valid);
    clearTokens();
    expect(readTokens()).toBeNull();
  });
});

describe('isExpired', () => {
  const now = 1_000_000;

  it('is false well before expiry', () => {
    expect(isExpired({ ...valid, expiresAt: now + 10 * 60_000 }, now)).toBe(false);
  });

  it('is true once inside the refresh skew', () => {
    expect(isExpired({ ...valid, expiresAt: now + EXPIRY_SKEW_MS - 1 }, now)).toBe(true);
  });

  it('is true after expiry', () => {
    expect(isExpired({ ...valid, expiresAt: now - 1 }, now)).toBe(true);
  });
});

describe('expiryFromNow', () => {
  it('converts seconds to an absolute ms epoch', () => {
    expect(expiryFromNow(3600, 1_000)).toBe(3_601_000);
  });
});
