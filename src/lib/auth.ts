/**
 * Authorization Code with PKCE, entirely in the browser. No backend, no client
 * secret. Shapes follow Spotify's PKCE tutorial (checked 2026-11-21):
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */
import { logDebug } from './debug';
import { codeChallenge, createState, createVerifier } from './pkce';
import {
  clearTokens,
  expiryFromNow,
  isExpired,
  readTokens,
  writeTokens,
  type Tokens,
} from './tokens';
import { currentRedirectUri } from './urls';

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

/** Verbatim from spec section 4. */
export const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

const VERIFIER_KEY = 'mm.pkce.verifier';
const STATE_KEY = 'mm.pkce.state';
/**
 * The hash does not survive the OAuth round trip, so a listener who opens a
 * tape link and logs in would otherwise land on the shelf instead of the tape.
 */
const RETURN_TO_KEY = 'mm.returnTo';

export class AuthError extends Error {
  readonly detail: unknown;

  constructor(message: string, detail?: unknown) {
    super(message);
    this.name = 'AuthError';
    this.detail = detail;
  }
}

export class NotLoggedInError extends Error {
  constructor() {
    super('Not logged in');
    this.name = 'NotLoggedInError';
  }
}

function clientId(): string {
  const id = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  if (!id) {
    throw new AuthError(
      'VITE_SPOTIFY_CLIENT_ID is not set. Add it to .env.local for dev, or to the repository variables for the Pages build.',
    );
  }
  return id;
}

export function isLoggedIn(): boolean {
  return readTokens() !== null;
}

/** Sends the browser to Spotify's authorize page. Does not return. */
export async function beginLogin(): Promise<void> {
  const verifier = createVerifier();
  const state = createState();

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(RETURN_TO_KEY, window.location.hash);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: await codeChallenge(verifier),
    redirect_uri: currentRedirectUri(),
    state,
  });

  logDebug('auth', 'Redirecting to Spotify authorize', {
    redirect_uri: currentRedirectUri(),
    returnTo: window.location.hash,
  });
  window.location.assign(AUTHORIZE_URL + '?' + params.toString());
}

/** True when this page load is the OAuth callback. */
export function hasAuthCallback(search: string = window.location.search): boolean {
  const params = new URLSearchParams(search);
  return params.has('code') || params.has('error');
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function requestTokens(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  let payload: TokenResponse = {};
  try {
    payload = (await response.json()) as TokenResponse;
  } catch {
    // Spotify returned something that is not JSON.
  }

  if (!response.ok || !payload.access_token) {
    logDebug('error', 'Token request failed with ' + response.status, payload);
    throw new AuthError(
      payload.error_description ??
        payload.error ??
        'Token request failed (' + response.status + ')',
      payload,
    );
  }

  return payload;
}

/**
 * Drops the OAuth query string and puts `mm.returnTo` back as the hash. The
 * debug flag is deliberately kept, because losing the panel at the end of the
 * login is losing it exactly when it is useful.
 */
function restoreUrl(): void {
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? '';
  sessionStorage.removeItem(RETURN_TO_KEY);

  const keepDebug = new URLSearchParams(window.location.search).get('debug') === '1';
  const query = keepDebug ? '?debug=1' : '';
  const url = window.location.pathname + query + returnTo;

  window.history.replaceState(null, '', url);
  logDebug('auth', 'Restored the URL after login', { url });
}

/**
 * Exchanges the `?code=` for tokens, then puts the URL back the way it was:
 * query string gone, `mm.returnTo` restored as the hash.
 */
export async function completeLogin(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const code = params.get('code');
  const state = params.get('state');

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);

  try {
    if (error) {
      throw new AuthError(
        error === 'access_denied'
          ? 'You said no to Spotify, so there is nothing to play.'
          : 'Spotify refused the login: ' + error,
        { error },
      );
    }
    if (!code) {
      throw new AuthError('Spotify sent us back without an authorization code.');
    }
    if (!expectedState || state !== expectedState) {
      throw new AuthError(
        'The login came back with the wrong state value, so we stopped it. Try logging in again.',
        { state, expectedState },
      );
    }
    if (!verifier) {
      throw new AuthError('The login verifier went missing. Try logging in again.');
    }

    const payload = await requestTokens(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: currentRedirectUri(),
        client_id: clientId(),
        code_verifier: verifier,
      }),
    );

    writeTokens({
      accessToken: payload.access_token as string,
      refreshToken: payload.refresh_token ?? '',
      expiresAt: expiryFromNow(payload.expires_in ?? 3600),
    });
    logDebug('auth', 'Logged in', { expiresIn: payload.expires_in });
  } finally {
    restoreUrl();
  }
}

let refreshInFlight: Promise<Tokens> | null = null;

async function refresh(tokens: Tokens): Promise<Tokens> {
  if (!tokens.refreshToken) {
    clearTokens();
    throw new AuthError('No refresh token, so we cannot stay logged in. Log in again.');
  }

  refreshInFlight ??= (async () => {
    try {
      const payload = await requestTokens(
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
          client_id: clientId(),
        }),
      );

      // Spotify may or may not hand back a new refresh token. Keep the old one
      // when it does not.
      const next: Tokens = {
        accessToken: payload.access_token as string,
        refreshToken: payload.refresh_token ?? tokens.refreshToken,
        expiresAt: expiryFromNow(payload.expires_in ?? 3600),
      };
      writeTokens(next);
      logDebug('auth', 'Refreshed the access token', { expiresIn: payload.expires_in });
      return next;
    } catch (cause) {
      clearTokens();
      throw cause;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** The access token to put on an API call, refreshed first if it is due. */
export async function getValidAccessToken(): Promise<string> {
  const tokens = readTokens();
  if (!tokens) throw new NotLoggedInError();

  if (isExpired(tokens)) {
    const refreshed = await refresh(tokens);
    return refreshed.accessToken;
  }
  return tokens.accessToken;
}

/** Refreshes whether or not the token looks expired. Used once after a 401. */
export async function forceRefresh(): Promise<string> {
  const tokens = readTokens();
  if (!tokens) throw new NotLoggedInError();
  const refreshed = await refresh(tokens);
  return refreshed.accessToken;
}

export function logout(): void {
  clearTokens();
  try {
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    // Nothing to do.
  }
  logDebug('auth', 'Logged out');
}
