/**
 * Spotify Web API client.
 *
 * Development Mode only. Every call goes through here so the debug panel sees
 * all of them, and so the 401-refresh-once rule lives in exactly one place.
 */
import { forceRefresh, getValidAccessToken, logout, NotLoggedInError } from './auth';
import { logDebug } from './debug';

const API_BASE = 'https://api.spotify.com/v1';

export class SpotifyApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'SpotifyApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * 403 from this app almost always means the account is not in the dashboard's
 * User Management list. Development Mode allows 5 users and refuses the rest.
 */
export class NotOnGuestListError extends SpotifyApiError {
  constructor(body?: unknown) {
    super(403, 'This Spotify account is not on the app guest list.', body);
    this.name = 'NotOnGuestListError';
  }
}

export { NotLoggedInError };

type RequestOptions = {
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE';
  /** JSON body. Omit for GET. */
  body?: unknown;
};

async function once(path: string, token: string, options: RequestOptions): Promise<Response> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Authorization: 'Bearer ' + token };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const init: RequestInit = { method, headers };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  return fetch(API_BASE + path, init);
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * One API call. Refreshes the token on a single 401 and retries; a second 401
 * logs out, as the spec requires. Raw error bodies go to the debug panel and
 * never to the screen.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const started = performance.now();

  let token = await getValidAccessToken();
  let response = await once(path, token, options);

  if (response.status === 401) {
    logDebug('api', method + ' ' + path + ' got 401, refreshing once');
    token = await forceRefresh();
    response = await once(path, token, options);

    if (response.status === 401) {
      logDebug('error', method + ' ' + path + ' still 401 after refresh, logging out');
      logout();
      throw new SpotifyApiError(401, 'Spotify logged us out. Log in again.');
    }
  }

  const body = await readBody(response);
  const ms = Math.round(performance.now() - started);
  logDebug('api', method + ' ' + path + ' -> ' + response.status + ' (' + ms + 'ms)', body);

  if (response.status === 403) {
    throw new NotOnGuestListError(body);
  }

  if (!response.ok) {
    const detail =
      typeof body === 'object' && body !== null && 'error' in body
        ? ((body as { error?: { message?: string } }).error?.message ?? '')
        : '';
    throw new SpotifyApiError(
      response.status,
      'Spotify returned ' + response.status + (detail ? ': ' + detail : ''),
      body,
    );
  }

  return body as T;
}

/* ------------------------------------------------------------------ types */

/**
 * The current user.
 *
 * `product` is deliberately optional. The February 2026 Development Mode
 * changes removed `country`, `email`, `explicit_content`, `followers` and
 * `product` from `GET /me`, so the Premium check in spec section 4 cannot rely
 * on it. See docs/DECISIONS.md.
 */
export type Me = {
  id: string;
  display_name: string | null;
  uri: string;
  images?: { url: string; width: number | null; height: number | null }[];
  product?: string;
  email?: string;
  country?: string;
};

export type Device = {
  id: string | null;
  is_active: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
};

export type Artist = { id: string; name: string; uri: string };

export type Track = {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: Artist[];
  album: { id: string; name: string; images?: { url: string }[] };
  external_urls: { spotify?: string };
  /** Only present when the request passes a `market`. */
  is_playable?: boolean;
};

/* --------------------------------------------------------------- requests */

export function getMe(): Promise<Me> {
  return api<Me>('/me');
}

export function getTrack(id: string): Promise<Track> {
  // Batch GET /tracks is gone in Development Mode; one request per track.
  // `market=from_token` makes Spotify fill in `is_playable` for the listener's
  // country so the J-card can mark tracks they cannot play.
  return api<Track>('/tracks/' + encodeURIComponent(id) + '?market=from_token');
}

export function getDevices(): Promise<{ devices: Device[] }> {
  return api<{ devices: Device[] }>('/me/player/devices');
}

export function setShuffle(state: boolean, deviceId?: string): Promise<void> {
  const device = deviceId ? '&device_id=' + encodeURIComponent(deviceId) : '';
  return api<void>('/me/player/shuffle?state=' + String(state) + device, { method: 'PUT' });
}

export function setRepeat(state: 'off' | 'track' | 'context', deviceId?: string): Promise<void> {
  const device = deviceId ? '&device_id=' + encodeURIComponent(deviceId) : '';
  return api<void>('/me/player/repeat?state=' + state + device, { method: 'PUT' });
}

export function transferPlayback(deviceId: string, play = false): Promise<void> {
  return api<void>('/me/player', { method: 'PUT', body: { device_ids: [deviceId], play } });
}

/** Starts a side. `uris` is the whole side so the SDK advances by itself. */
export function startPlayback(args: {
  deviceId?: string;
  uris: string[];
  position: number;
  positionMs?: number;
}): Promise<void> {
  const device = args.deviceId ? '?device_id=' + encodeURIComponent(args.deviceId) : '';
  return api<void>('/me/player/play' + device, {
    method: 'PUT',
    body: {
      uris: args.uris,
      offset: { position: args.position },
      position_ms: args.positionMs ?? 0,
    },
  });
}
