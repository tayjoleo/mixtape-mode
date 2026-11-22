/**
 * Small deterministic helpers for looks that should be random but stable.
 *
 * The shelf tilts each spine a little, the way tapes lean on a real shelf.
 * That tilt is seeded by the tape id so it is the same every render: a spine
 * that jumped to a new angle on every repaint would be unbearable.
 */

/**
 * Spreads the bits of a hash out.
 *
 * This is MurmurHash3's finalizer, and it is load-bearing rather than
 * decoration. FNV-1a's last step leaves most of a trailing character's
 * influence in the low bits, so ids that differ only at the end - which is
 * exactly what a run of tape ids looks like - came out with nearly identical
 * high bits, and every spine on the shelf leaned the same way.
 */
function avalanche(input: number): number {
  let hash = input;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** FNV-1a. Not for security, only for turning a string into a stable number. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return avalanche(hash);
}

/** A stable number in [0, 1) for this seed. */
export function seededUnit(seed: string): number {
  return hashString(seed) / 0x100000000;
}

/**
 * Degrees of lean for one spine, stable for a given tape id.
 *
 * Kept small on purpose: the design reference leans between about -0.6 and
 * 0.7 degrees, enough to look stacked by hand and not enough to look broken.
 */
export function seededTilt(seed: string, maxDegrees = 0.7): number {
  const spread = seededUnit(seed) * 2 - 1;
  return Math.round(spread * maxDegrees * 10) / 10;
}
