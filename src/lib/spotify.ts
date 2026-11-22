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

/* ------------------------------------------------------- search and lists */

export type SearchPage = { tracks: Track[]; total: number; nextOffset: number | null };

/**
 * Track search.
 *
 * Development Mode caps `limit` at 10 (default 5), so paging uses `offset`.
 * Ten is inside the cap whichever quota mode the app is in, so this works
 * either way.
 */
export const SEARCH_PAGE_SIZE = 10;

export async function searchTracks(query: string, offset = 0): Promise<SearchPage> {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: String(SEARCH_PAGE_SIZE),
    offset: String(offset),
    market: 'from_token',
  });

  const body = await api<{ tracks?: { items?: (Track | null)[]; total?: number } }>(
    '/search?' + params.toString(),
  );

  const items = (body.tracks?.items ?? []).filter((item): item is Track => item !== null);
  const total = body.tracks?.total ?? items.length;
  const next = offset + SEARCH_PAGE_SIZE;

  return { tracks: items, total, nextOffset: next < total ? next : null };
}

export type Playlist = {
  id: string;
  name: string;
  owner: { id: string; display_name: string | null };
  collaborative: boolean;
  images: { url: string }[];
  trackCount: number;
};

/** The user's own playlists. `GET /users/{id}/playlists` is gone; this is it. */
export async function getMyPlaylists(limit = 50): Promise<Playlist[]> {
  const body = await api<{ items?: unknown[] }>('/me/playlists?limit=' + String(limit));

  return (body.items ?? [])
    .map((raw): Playlist | null => {
      if (typeof raw !== 'object' || raw === null) return null;
      const item = raw as Record<string, unknown>;
      if (typeof item.id !== 'string' || typeof item.name !== 'string') return null;

      // The track count sits under `tracks.total`, or `items.total` after the
      // February 2026 rename.
      const counter = (item.tracks ?? item.items) as { total?: number } | undefined;
      const owner = (item.owner ?? {}) as { id?: string; display_name?: string | null };

      return {
        id: item.id,
        name: item.name,
        owner: { id: owner.id ?? '', display_name: owner.display_name ?? null },
        collaborative: item.collaborative === true,
        images: Array.isArray(item.images) ? (item.images as { url: string }[]) : [],
        trackCount: counter?.total ?? 0,
      };
    })
    .filter((playlist): playlist is Playlist => playlist !== null);
}

/** Accepts both the pre- and post-February-2026 response shapes. */
export function readPlaylistItems(body: unknown): Track[] {
  if (typeof body !== 'object' || body === null) return [];
  const root = body as Record<string, unknown>;

  // The items endpoint returns the page directly; a whole playlist object
  // nests it under `items` or, before the rename, `tracks`.
  const page = (Array.isArray(root.items) ? root : (root.items ?? root.tracks)) as
    Record<string, unknown> | undefined;

  const rows = Array.isArray(page?.items) ? page.items : [];

  return rows
    .map((row): Track | null => {
      if (typeof row !== 'object' || row === null) return null;
      const entry = row as Record<string, unknown>;
      const track = (entry.item ?? entry.track) as Track | null | undefined;

      // Local files and podcast episodes have no usable track id.
      if (!track || typeof track.id !== 'string' || typeof track.name !== 'string') return null;
      if ((track as { type?: string }).type === 'episode') return null;

      return track;
    })
    .filter((track): track is Track => track !== null);
}

/**
 * The tracks in one playlist.
 *
 * February 2026 renamed this endpoint from `/tracks` to `/items` for
 * Development Mode apps, and renamed the nested `track` field to `item`.
 * Which one is live depends on the app's quota mode, which the API will not
 * tell us, so this tries the new name, falls back to the old one, and accepts
 * either response shape.
 *
 * Either way, contents only come back for playlists the user owns or
 * collaborates on.
 */
export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  const id = encodeURIComponent(playlistId);
  const query = '?limit=50&market=from_token';

  let body: unknown;
  try {
    body = await api<unknown>('/playlists/' + id + '/items' + query);
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 0;
    if (status === 404 || status === 400) {
      logDebug('api', 'Playlist /items was refused, trying /tracks instead');
      body = await api<unknown>('/playlists/' + id + '/tracks' + query);
    } else {
      throw error;
    }
  }

  return readPlaylistItems(body);
}

export function trackUri(id: string): string {
  return 'spotify:track:' + id;
}

/* ------------------------------------------------------------------ probe */

export type ProbeResult = { name: string; status: number; note: string };

/**
 * Pokes the endpoints whose behaviour depends on the app's quota mode, so we
 * can stop guessing which mode we are in. Read-only, and every call here is
 * one the app already makes or already has a fallback for.
 */
export async function probeApiMode(): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];

  async function probe(name: string, path: string, describe: (body: unknown) => string) {
    try {
      results.push({ name, status: 200, note: describe(await api<unknown>(path)) });
    } catch (error) {
      const status = error instanceof SpotifyApiError ? error.status : 0;
      results.push({
        name,
        status,
        note: status === 0 ? 'the request failed' : 'refused with ' + status,
      });
    }
  }

  await probe(
    'Batch GET /tracks',
    '/tracks?ids=2PpruBYCo4H7WOBJ7Q2EwM,0eGsygTp906u18L0Oimnem',
    (body) => {
      const list = (body as { tracks?: unknown[] }).tracks;
      return Array.isArray(list)
        ? 'returned ' + list.length + ', so batch fetching is available'
        : 'returned an unexpected shape';
    },
  );

  await probe('Search with limit=50', '/search?q=love&type=track&limit=50', (body) => {
    const count = (body as { tracks?: { items?: unknown[] } }).tracks?.items?.length ?? 0;
    return count > 10
      ? 'returned ' + count + ', so there is no Development Mode cap'
      : 'returned ' + count + ', so the limit is capped at 10';
  });

  await probe('Profile fields on /me', '/me', (body) => {
    const me = body as Record<string, unknown>;
    const present = ['product', 'email', 'country', 'followers'].filter((key) => key in me);
    return present.length > 0
      ? 'still returns ' + present.join(', ')
      : 'returns the reduced Development Mode field set';
  });

  logDebug('api', 'API mode probe finished', results);
  return results;
}
