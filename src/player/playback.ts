/**
 * Working out where we are on the tape.
 *
 * The SDK tells us which track is playing; the tape tells us which side it
 * belongs to and how far along it is. Keeping that derivation pure means the
 * awkward parts - end of side, flipping, rewind inside a track - can be tested
 * without a browser, an account or a device.
 */
export type SideId = 'a' | 'b';

export const OTHER_SIDE: Record<SideId, SideId> = { a: 'b', b: 'a' };

export function sideLabel(side: SideId): 'A' | 'B' {
  return side === 'a' ? 'A' : 'B';
}

/** Spec section 6: rewind restarts the track if more than 3 seconds in. */
export const RESTART_THRESHOLD_MS = 3000;

/** Pulls the bare track id out of a `spotify:track:<id>` URI. */
export function idFromUri(uri: string | null | undefined): string | null {
  if (typeof uri !== 'string') return null;
  const match = /^spotify:track:([A-Za-z0-9]{22})$/.exec(uri);
  return match?.[1] ?? null;
}

/**
 * Which track of the side is playing, by matching the id against the list.
 *
 * Returns null when the playing track is not on this side at all, which
 * happens if something else on the account takes the device over. The caller
 * treats that as "not our playback" rather than guessing a position.
 */
export function indexOfPlaying(
  currentUri: string | null | undefined,
  sideIds: readonly string[],
): number | null {
  const id = idFromUri(currentUri);
  if (id === null) return null;

  const index = sideIds.indexOf(id);
  return index === -1 ? null : index;
}

export type PlaybackSnapshot = {
  paused: boolean;
  position: number;
  duration: number;
  currentUri: string | null;
};

/**
 * Has this side just run out?
 *
 * Repeat is off, so when the last track finishes the SDK stops and reports the
 * final track paused at position 0. That pairing is the signal. It is only
 * trusted once playback has actually started, because a freshly created player
 * also sits paused at position 0 and that is not the end of anything.
 */
export function isEndOfSide(
  snapshot: PlaybackSnapshot,
  sideIds: readonly string[],
  hasStarted: boolean,
): boolean {
  if (!hasStarted || sideIds.length === 0) return false;
  if (!snapshot.paused || snapshot.position !== 0) return false;

  const index = indexOfPlaying(snapshot.currentUri, sideIds);
  return index === sideIds.length - 1;
}

/**
 * What rewind should do: restart the current track if we are far enough into
 * it, otherwise step back, and sit still at the very start of a side.
 */
export function rewindAction(
  positionMs: number,
  index: number,
): 'restart' | 'previous' | 'nothing' {
  if (positionMs > RESTART_THRESHOLD_MS) return 'restart';
  if (index > 0) return 'previous';
  // Nothing before track 1. Restarting is friendlier than ignoring the tap.
  return 'nothing';
}

/** What fast forward should do, given there is nothing after the last track. */
export function forwardAction(index: number, sideLength: number): 'next' | 'end-of-side' {
  return index < sideLength - 1 ? 'next' : 'end-of-side';
}

/** `1:24`, the way the design reference writes it. */
export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function progressPercent(positionMs: number, durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
  return Math.min(100, Math.max(0, (positionMs / durationMs) * 100));
}

/**
 * Which side a tape should open on. A tape with an empty Side B still has to
 * start somewhere.
 */
export function openingSide(sides: { a: readonly string[]; b: readonly string[] }): SideId {
  return sides.a.length > 0 ? 'a' : 'b';
}
