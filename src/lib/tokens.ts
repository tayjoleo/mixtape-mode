/**
 * Token storage. Access token, refresh token and expiry live in localStorage so
 * a listener who closes the tab and comes back to a tape link is still logged
 * in. Anything that fails to parse is treated as "not logged in" rather than
 * crashing the app.
 */
export type Tokens = {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** ms epoch */
  readonly expiresAt: number;
};

const TOKENS_KEY = 'mm.tokens';

/** Refresh this far ahead of expiry so a call never goes out on a dead token. */
export const EXPIRY_SKEW_MS = 60_000;

function isTokens(value: unknown): value is Tokens {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.length > 0 &&
    typeof candidate.refreshToken === 'string' &&
    candidate.refreshToken.length > 0 &&
    typeof candidate.expiresAt === 'number' &&
    Number.isFinite(candidate.expiresAt)
  );
}

export function readTokens(): Tokens | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(TOKENS_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isTokens(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: Tokens): void {
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // Storage full or blocked. The session still works until reload.
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(TOKENS_KEY);
  } catch {
    // Nothing to do.
  }
}

export function isExpired(tokens: Tokens, now: number = Date.now()): boolean {
  return tokens.expiresAt - EXPIRY_SKEW_MS <= now;
}

/** Turns Spotify's `expires_in` (seconds) into our absolute expiry. */
export function expiryFromNow(expiresInSeconds: number, now: number = Date.now()): number {
  return now + expiresInSeconds * 1000;
}
