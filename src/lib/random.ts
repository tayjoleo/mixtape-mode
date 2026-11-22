/**
 * Base62 random strings. Used for the PKCE verifier and state, and for tape
 * ids. One implementation so there is one thing to get right.
 */
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function randomString(length: number): string {
  const values = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const value of values) {
    out += BASE62[value % BASE62.length];
  }
  return out;
}
