/**
 * Getting a tape into a link and back out again.
 *
 * Spec section 5: map to short keys, `JSON.stringify`, then
 * `LZString.compressToEncodedURIComponent`. The link is `<base>#/t/<payload>`.
 *
 * Two things keep the payload small. Keys are one character each, and the
 * nested `cover` and `sides` objects are flattened to the top level so their
 * braces and names do not have to be paid for. Optional and empty fields are
 * left out entirely and restored by the decoder.
 */
import LZString from 'lz-string';
import { logDebug } from '../lib/debug';
import { coerceTape, type WireTape } from './validate';
import { TAPE_VERSION, type Tape } from './types';

/**
 * Why a decode failed. All of these show the "chewed up" screen, but keeping
 * them apart means the copy can say something true about which kind of broken
 * it is.
 */
export type DecodeFailure =
  /** Not our payload at all: it would not decompress or parse. */
  | 'unreadable'
  /** A format version this build does not know how to read. */
  | 'version'
  /** Read fine, but there is nothing to play. */
  | 'empty';

export type DecodeResult = { ok: true; tape: Tape } | { ok: false; reason: DecodeFailure };

/** Maps a tape onto the short-key wire shape. */
export function toWire(tape: Tape): WireTape {
  const wire: WireTape = {
    v: TAPE_VERSION,
    i: tape.id,
    t: tape.title,
    f: tape.from,
    s: tape.shell,
    r: tape.reels,
    k: tape.sticker,
    n: tape.font,
    c: tape.ink,
    q: tape.sealed ? 1 : 0,
    p: tape.cover.inks,
    m: tape.cover.misregister,
    A: tape.sides.a,
    w: tape.createdAt,
  };

  // Everything below is optional. Omitting it is the cheapest compression there
  // is, and the decoder fills each one back in.
  if (tape.to !== undefined && tape.to !== '') wire.o = tape.to;
  if (tape.doodles.length > 0) wire.d = tape.doodles;
  if (tape.sides.b.length > 0) wire.B = tape.sides.b;

  return wire;
}

export function encodeTape(tape: Tape): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(toWire(tape)));
}

export function decodeTape(payload: string): DecodeResult {
  if (typeof payload !== 'string' || payload.trim() === '') {
    return { ok: false, reason: 'unreadable' };
  }

  let json: string | null;
  try {
    json = LZString.decompressFromEncodedURIComponent(payload);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  if (json === null || json === '') return { ok: false, reason: 'unreadable' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: 'unreadable' };
  }

  const wire = parsed as WireTape;

  // Version first. Guessing at the fields of a format we do not know would be
  // worse than saying so.
  if (wire.v !== TAPE_VERSION) {
    return { ok: false, reason: 'version' };
  }

  const tape = coerceTape(wire);

  // Validation drops track ids that do not match the pattern, so a tape can
  // arrive here with nothing left on Side A. There is no tape without Side A.
  if (tape.sides.a.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  return { ok: true, tape };
}

/** The full shareable link for a tape, against the current origin and base. */
export function tapeUrl(tape: Tape, origin = window.location.origin): string {
  return origin + import.meta.env.BASE_URL + '#/t/' + encodeTape(tape);
}

/** Pulls the payload out of a `#/t/<payload>` hash. */
export function payloadFromHash(hash: string): string | null {
  const match = /^#\/t\/(.+)$/.exec(hash);
  return match?.[1] ?? null;
}

/** Decodes and logs, for use at the point a tape link is opened. */
export function readTapeFromPayload(payload: string): DecodeResult {
  const result = decodeTape(payload);
  if (result.ok) {
    logDebug('app', 'Decoded a tape', {
      id: result.tape.id,
      sideA: result.tape.sides.a.length,
      sideB: result.tape.sides.b.length,
      payloadChars: payload.length,
    });
  } else {
    logDebug('error', 'Could not decode the tape link', { reason: result.reason });
  }
  return result;
}
