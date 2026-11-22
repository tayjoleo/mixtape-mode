import { describe, expect, it } from 'vitest';
import {
  base64UrlEncode,
  codeChallenge,
  createState,
  createVerifier,
  STATE_LENGTH,
  VERIFIER_LENGTH,
} from './pkce';

describe('createVerifier and createState', () => {
  it('uses a verifier length inside the 43 to 128 character window', () => {
    expect(createVerifier()).toHaveLength(VERIFIER_LENGTH);
    expect(VERIFIER_LENGTH).toBeGreaterThanOrEqual(43);
    expect(VERIFIER_LENGTH).toBeLessThanOrEqual(128);
  });

  it('makes a state value', () => {
    expect(createState()).toHaveLength(STATE_LENGTH);
  });
});

describe('base64UrlEncode', () => {
  it('encodes without padding or URL-unsafe characters', () => {
    // These bytes are "+/" and "?" in standard base64, so they prove the swap.
    const bytes = new Uint8Array([251, 255, 190, 63]).buffer;
    const encoded = base64UrlEncode(bytes);
    expect(encoded).not.toContain('=');
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('matches a known vector', () => {
    const bytes = new TextEncoder().encode('hello world').buffer as ArrayBuffer;
    expect(base64UrlEncode(bytes)).toBe('aGVsbG8gd29ybGQ');
  });
});

describe('codeChallenge', () => {
  it('matches the RFC 7636 appendix B test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    await expect(codeChallenge(verifier)).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('is stable for the same verifier and different for another', async () => {
    const a = await codeChallenge('verifier-one');
    const b = await codeChallenge('verifier-one');
    const c = await codeChallenge('verifier-two');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
