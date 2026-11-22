/**
 * Track metadata for the J-card.
 *
 * Batch `GET /tracks` is gone in Development Mode, so twenty tracks means
 * twenty requests. They are fetched once, lazily, the first time the J-card
 * opens, then cached in memory and in `sessionStorage` so flipping the card
 * open and shut never costs anything again.
 */
import { logDebug } from './debug';
import { getTrack, SpotifyApiError, type Track } from './spotify';

/** A track Spotify would not give us, or cannot play here. */
export type TrackEntry =
  | { status: 'ok'; track: Track }
  | { status: 'unavailable'; id: string }
  | { status: 'missing'; id: string };

const STORAGE_KEY = 'mm.tracks';

/** How many requests to have in flight at once. Polite, and avoids 429s. */
const CONCURRENCY = 4;

const memory = new Map<string, TrackEntry>();
const inFlight = new Map<string, Promise<TrackEntry>>();

let restored = false;

/** sessionStorage, not localStorage: this is a convenience, not a record. */
function restoreFromSession(): void {
  if (restored) return;
  restored = true;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return;

    for (const [id, entry] of Object.entries(parsed as Record<string, TrackEntry>)) {
      if (entry && typeof entry === 'object' && 'status' in entry) {
        memory.set(id, entry);
      }
    }
    logDebug('app', 'Restored ' + memory.size + ' track(s) from sessionStorage');
  } catch {
    // A corrupt cache is not worth a crash. We just fetch again.
  }
}

function persist(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch {
    // Quota or private mode. The in-memory cache still works for this visit.
  }
}

async function fetchOne(id: string): Promise<TrackEntry> {
  try {
    const track = await getTrack(id);

    // `market=from_token` makes Spotify fill in `is_playable` for the
    // listener's country. False means the song is on the tape but will not
    // play here, and the J-card says so rather than the player stalling.
    const entry: TrackEntry =
      track.is_playable === false ? { status: 'unavailable', id } : { status: 'ok', track };

    memory.set(id, entry);
    return entry;
  } catch (error) {
    // A 404 means the track is gone. Anything else is logged and treated the
    // same way: the J-card shows the row as missing rather than vanishing it.
    const status = error instanceof SpotifyApiError ? error.status : 0;
    logDebug('error', 'Could not load track ' + id, { status });

    const entry: TrackEntry = { status: 'missing', id };
    memory.set(id, entry);
    return entry;
  }
}

/** One entry, from cache if we have it. Concurrent callers share one request. */
export function loadTrack(id: string): Promise<TrackEntry> {
  restoreFromSession();

  const cached = memory.get(id);
  if (cached) return Promise.resolve(cached);

  const existing = inFlight.get(id);
  if (existing) return existing;

  const request = fetchOne(id).finally(() => {
    inFlight.delete(id);
  });
  inFlight.set(id, request);
  return request;
}

/**
 * Loads every id, a few at a time, and reports progress as it goes so the
 * J-card can fill in rather than sitting blank until the last one lands.
 */
export async function loadTracks(
  ids: readonly string[],
  onProgress?: (entries: ReadonlyMap<string, TrackEntry>) => void,
): Promise<ReadonlyMap<string, TrackEntry>> {
  restoreFromSession();

  const wanted = [...new Set(ids)];
  const results = new Map<string, TrackEntry>();

  for (const id of wanted) {
    const cached = memory.get(id);
    if (cached) results.set(id, cached);
  }

  const missing = wanted.filter((id) => !results.has(id));
  if (missing.length === 0) return results;

  logDebug('api', 'Loading ' + missing.length + ' track(s) for the J-card');

  let cursor = 0;
  async function worker() {
    while (cursor < missing.length) {
      const id = missing[cursor];
      cursor += 1;
      if (id === undefined) break;

      const entry = await loadTrack(id);
      results.set(id, entry);
      onProgress?.(new Map(results));
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, missing.length) }, () => worker()));

  persist();
  return results;
}

export function cachedTrack(id: string): TrackEntry | undefined {
  restoreFromSession();
  return memory.get(id);
}

/** Used on logout, so the next listener does not inherit this one's cache. */
export function clearTrackCache(): void {
  memory.clear();
  inFlight.clear();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/** Track name, artists and album, exactly as Spotify returned them. */
export function trackLine(track: Track): { name: string; artists: string; album: string } {
  return {
    name: track.name,
    artists: track.artists.map((artist) => artist.name).join(', '),
    album: track.album.name,
  };
}
