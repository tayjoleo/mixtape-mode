/**
 * The shelf: tapes you made and tapes people sent you, in `localStorage`.
 *
 * Spec section 6 stores entries as `{ payload, role, savedAt }`. The payload
 * is the tape itself, so the shelf is a list of links rather than a copy of
 * the data: a tape can always be re-read from its own entry, and nothing here
 * has to migrate when the tape format changes.
 */
import { logDebug } from './debug';
import { decodeTape } from '../tape/encode';
import type { Tape } from '../tape/types';

export type ShelfRole = 'made' | 'received';

export type ShelfEntry = {
  payload: string;
  role: ShelfRole;
  /** ms epoch */
  savedAt: number;
};

const SHELF_KEY = 'mm.shelf';

/** Enough for a small group to send each other tapes for a long time. */
const MAX_ENTRIES = 200;

function isEntry(value: unknown): value is ShelfEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.payload === 'string' &&
    entry.payload.length > 0 &&
    (entry.role === 'made' || entry.role === 'received') &&
    typeof entry.savedAt === 'number' &&
    Number.isFinite(entry.savedAt)
  );
}

export function readShelf(): ShelfEntry[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SHELF_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    // A corrupt shelf is not worth a crash, and the tapes themselves live in
    // the links people were sent.
    logDebug('error', 'The shelf would not parse, starting from empty');
    return [];
  }
}

function writeShelf(entries: ShelfEntry[]): void {
  try {
    localStorage.setItem(SHELF_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    logDebug('error', 'Could not write the shelf: storage is full or blocked');
  }
}

/**
 * Adds a tape, newest first.
 *
 * A tape you made stays yours even if you later open your own link: spec
 * section 6 says opening a link files it under "sent to me" unless it is
 * already there as "made".
 */
export function saveToShelf(payload: string, role: ShelfRole): ShelfEntry[] {
  const entries = readShelf();
  const existing = entries.find((entry) => entry.payload === payload);

  if (existing) {
    if (existing.role === 'made' || existing.role === role) return entries;
    // It was received and is now being saved as made: made wins.
    if (role === 'made') existing.role = 'made';
    writeShelf(entries);
    return entries;
  }

  const next = [{ payload, role, savedAt: Date.now() }, ...entries];
  writeShelf(next);
  logDebug('app', 'Saved a tape to the shelf', { role, total: next.length });
  return next;
}

export function removeFromShelf(payload: string): ShelfEntry[] {
  const next = readShelf().filter((entry) => entry.payload !== payload);
  writeShelf(next);
  return next;
}

export type ShelfTape = { entry: ShelfEntry; tape: Tape };

/** The shelf with every entry decoded. Entries that no longer decode are dropped. */
export function readShelfTapes(role?: ShelfRole): ShelfTape[] {
  return readShelf()
    .filter((entry) => role === undefined || entry.role === role)
    .map((entry) => {
      const result = decodeTape(entry.payload);
      return result.ok ? { entry, tape: result.tape } : null;
    })
    .filter((item): item is ShelfTape => item !== null);
}
