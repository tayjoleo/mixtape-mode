/**
 * PKCE helpers.
 *
 * Shapes follow Spotify's "Authorization Code with PKCE Flow" tutorial:
 * a 64 character high-entropy verifier, and a challenge that is the
 * base64url encoding of its SHA-256 digest with the padding stripped.
 * There is no client secret anywhere in this flow.
 */
const UNRESERVED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const VERIFIER_LENGTH = 64;
export const STATE_LENGTH = 24;

export function randomString(length: number): string {
  const values = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const value of values) {
    out += UNRESERVED[value % UNRESERVED.length];
  }
  return out;
}

export function base64UrlEncode(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(digest);
}

export function createVerifier(): string {
  return randomString(VERIFIER_LENGTH);
}

export function createState(): string {
  return randomString(STATE_LENGTH);
}
