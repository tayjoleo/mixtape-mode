/**
 * Redirect URI handling.
 *
 * Spotify requires HTTPS redirect URIs except for loopback IP literals, and
 * `localhost` is explicitly not allowed. These two URIs are registered in the
 * Spotify developer dashboard exactly as written, trailing slash included, and
 * the app must send whichever one matches the current origin.
 */
export const REGISTERED_REDIRECT_URIS = [
  'http://127.0.0.1:5173/',
  'https://tayjoleo.github.io/mixtape-mode/',
] as const;

export class RedirectUriError extends Error {}

/**
 * Builds the redirect URI from the current origin and the Vite base path, then
 * checks it against the registered list. Anything unregistered throws loudly
 * rather than failing later inside Spotify's authorize page.
 */
export function buildRedirectUri(origin: string, base: string): string {
  if (origin.includes('localhost')) {
    throw new RedirectUriError(
      'Spotify does not accept localhost as a redirect URI. Open the app on http://127.0.0.1:5173/ instead.',
    );
  }

  const uri = origin.replace(/\/+$/, '') + (base.endsWith('/') ? base : base + '/');

  if (!isRegisteredRedirectUri(uri)) {
    throw new RedirectUriError(
      `${uri} is not registered in the Spotify dashboard. Registered: ${REGISTERED_REDIRECT_URIS.join(', ')}`,
    );
  }

  return uri;
}

export function isRegisteredRedirectUri(uri: string): boolean {
  return (REGISTERED_REDIRECT_URIS as readonly string[]).includes(uri);
}

/** The redirect URI for the page we are running on right now. */
export function currentRedirectUri(): string {
  return buildRedirectUri(window.location.origin, import.meta.env.BASE_URL);
}
