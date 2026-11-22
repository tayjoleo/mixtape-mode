/**
 * Spotify track ids. The pattern is the same one the tape decoder uses to throw
 * out junk from an untrusted link (spec section 5), so it lives here where both
 * can share it.
 */
export const TRACK_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

export function isTrackId(value: unknown): value is string {
  return typeof value === 'string' && TRACK_ID_PATTERN.test(value);
}

export function trackUri(id: string): string {
  return 'spotify:track:' + id;
}

/**
 * Pulls a track id out of whatever someone pasted: a bare id, a `spotify:` URI,
 * or an open.spotify.com link with or without query parameters.
 */
export function parseTrackId(input: string): string | null {
  const trimmed = input.trim();

  if (TRACK_ID_PATTERN.test(trimmed)) return trimmed;

  const uri = /^spotify:track:([A-Za-z0-9]{22})$/.exec(trimmed);
  if (uri?.[1]) return uri[1];

  const url =
    /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{22})(?:[/?#]|$)/.exec(
      trimmed,
    );
  if (url?.[1]) return url[1];

  return null;
}
