/**
 * Validating a decoded tape.
 *
 * The payload is untrusted input. Anyone can craft a link, so nothing in here
 * trusts a type, a length, a range or a character. Spec section 5: unknown
 * enum values fall back to defaults, strings are clamped, and track ids and
 * doodle paths that do not match their patterns are dropped.
 *
 * Nothing here throws. Coercion always lands on a valid tape, so a slightly
 * mangled link still plays instead of showing an error screen.
 */
import { capDoodles } from './doodles';
import {
  DEFAULTS,
  DOODLE_PATH_PATTERN,
  FONT_IDS,
  INK_IDS,
  INK_PAIR_IDS,
  LIMITS,
  REEL_IDS,
  SHELL_IDS,
  STICKER_IDS,
  TAPE_VERSION,
  TRACK_ID_PATTERN,
  makeTapeId,
  type FontId,
  type InkId,
  type InkPairId,
  type ReelId,
  type ShellId,
  type StickerId,
  type Tape,
} from './types';

/** Picks `value` if it is one of `allowed`, otherwise the fallback. */
function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Clamps a string to `max` characters.
 *
 * Trimmed first, and any control character is stripped: a title full of
 * newlines or zero-width joiners would wreck the label without ever failing a
 * length check. React escapes the text on render, so this is about the layout
 * holding together, not about script injection.
 */
function isInvisible(codePoint: number): boolean {
  return (
    // C0 controls, including newlines and tabs.
    codePoint <= 0x1f ||
    // DEL and the C1 controls.
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    // Zero-width spaces and joiners, and the bidi overrides, which can make a
    // label render as something other than what it says.
    (codePoint >= 0x200b && codePoint <= 0x200f) ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    // Line and paragraph separators.
    codePoint === 0x2028 ||
    codePoint === 0x2029 ||
    // Byte order mark.
    codePoint === 0xfeff
  );
}

export function clampText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';

  // Counted by code point, so an emoji costs one character rather than two and
  // never gets sliced in half.
  const kept = [...value].filter((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && !isInvisible(codePoint);
  });

  return [...kept.join('').trim()].slice(0, max).join('');
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  // The wire format writes booleans as 1 and 0 to save characters.
  if (value === 1) return true;
  if (value === 0) return false;
  return fallback;
}

/** Keeps only well-formed Spotify track ids, up to the per-side maximum. */
export function cleanTrackIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string' || !TRACK_ID_PATTERN.test(item)) continue;
    // The same song twice on one side is almost certainly a mistake, and it
    // would make "Track 3 of 8" ambiguous when matching the playing track.
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length === LIMITS.tracksPerSide) break;
  }

  return out;
}

/** Keeps only doodle paths that match the M/L grammar, then applies the cap. */
export function cleanDoodles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const valid = value.filter(
    (item): item is string =>
      typeof item === 'string' && item.length > 0 && DOODLE_PATH_PATTERN.test(item),
  );

  return capDoodles(valid);
}

function cleanId(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9]{1,16}$/.test(value) ? value : makeTapeId();
}

function cleanCreatedAt(value: unknown): number {
  // Anything outside a sane window is treated as "now" rather than trusted.
  const earliest = Date.UTC(2020, 0, 1);
  const latest = Date.now() + 24 * 60 * 60 * 1000;
  if (typeof value !== 'number' || !Number.isFinite(value)) return Date.now();
  return value < earliest || value > latest ? Date.now() : Math.round(value);
}

/** The shape the encoder writes: short keys, flattened, booleans as 1 and 0. */
export type WireTape = {
  v?: unknown;
  i?: unknown;
  t?: unknown;
  f?: unknown;
  o?: unknown;
  s?: unknown;
  r?: unknown;
  k?: unknown;
  n?: unknown;
  c?: unknown;
  d?: unknown;
  q?: unknown;
  p?: unknown;
  m?: unknown;
  A?: unknown;
  B?: unknown;
  w?: unknown;
};

/**
 * Turns an untrusted wire object into a valid tape. Never throws.
 *
 * The version is not checked here; `decodeTape` does that, because an unknown
 * version deserves its own answer rather than a guess at the fields.
 */
export function coerceTape(raw: WireTape): Tape {
  const to = clampText(raw.o, LIMITS.toMax);

  const tape: Tape = {
    v: TAPE_VERSION,
    id: cleanId(raw.i),
    title: clampText(raw.t, LIMITS.titleMax),
    from: clampText(raw.f, LIMITS.fromMax),
    shell: oneOf<ShellId>(raw.s, SHELL_IDS, DEFAULTS.shell),
    reels: oneOf<ReelId>(raw.r, REEL_IDS, DEFAULTS.reels),
    sticker: oneOf<StickerId>(raw.k, STICKER_IDS, DEFAULTS.sticker),
    font: oneOf<FontId>(raw.n, FONT_IDS, DEFAULTS.font),
    ink: oneOf<InkId>(raw.c, INK_IDS, DEFAULTS.ink),
    doodles: cleanDoodles(raw.d),
    sealed: asBoolean(raw.q, DEFAULTS.sealed),
    cover: {
      inks: oneOf<InkPairId>(raw.p, INK_PAIR_IDS, DEFAULTS.inks),
      misregister: clampNumber(
        raw.m,
        LIMITS.misregisterMin,
        LIMITS.misregisterMax,
        DEFAULTS.misregister,
      ),
    },
    sides: { a: cleanTrackIds(raw.A), b: cleanTrackIds(raw.B) },
    createdAt: cleanCreatedAt(raw.w),
  };

  // `to` is optional. Leaving the key off entirely keeps it out of the link.
  return to === '' ? tape : { ...tape, to };
}
