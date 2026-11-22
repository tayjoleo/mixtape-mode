/**
 * The tape format, from spec section 5.
 *
 * A tape lives entirely in the link. There is no database, so this type is the
 * whole product: whatever is not in here cannot be sent to anyone.
 *
 * Every id list below is the single source of truth for its enum. Decoding
 * falls back to the default when it meets a value that is not in the list, so
 * an old or hand-edited link degrades instead of exploding.
 */
import { randomString } from '../lib/random';

export const SHELL_IDS = [
  'clear-green',
  'clear-cyan',
  'crystal',
  'clear-smoke',
  'hot-pink',
  'sunshine',
  'lime',
  'jet-black',
] as const;
export type ShellId = (typeof SHELL_IDS)[number];

export const REEL_IDS = ['white', 'pink', 'yellow', 'grey'] as const;
export type ReelId = (typeof REEL_IDS)[number];

export const STICKER_IDS = ['strip', 'lined', 'tape', 'retail'] as const;
export type StickerId = (typeof STICKER_IDS)[number];

export const FONT_IDS = ['permanent-marker', 'caveat', 'rock-salt', 'gochi-hand'] as const;
export type FontId = (typeof FONT_IDS)[number];

export const INK_IDS = ['black', 'red', 'blue', 'pink'] as const;
export type InkId = (typeof INK_IDS)[number];

export const INK_PAIR_IDS = ['pink-blue', 'red-green', 'yellow-purple', 'pink-black'] as const;
export type InkPairId = (typeof INK_PAIR_IDS)[number];

export type Tape = {
  /** Format version, for future migrations. */
  v: 1;
  /** 8 random base62 characters. */
  id: string;
  title: string;
  from: string;
  to?: string;
  shell: ShellId;
  reels: ReelId;
  sticker: StickerId;
  font: FontId;
  ink: InkId;
  /** SVG path data in a 300x80 viewBox, integer coordinates, M and L only. */
  doodles: string[];
  /** J-card sealed until Side A ends. */
  sealed: boolean;
  cover: { inks: InkPairId; misregister: number };
  /** Spotify track ids. Side A needs at least one; Side B may be empty. */
  sides: { a: string[]; b: string[] };
  /** ms epoch */
  createdAt: number;
};

export const TAPE_VERSION = 1;

export const LIMITS = {
  idLength: 8,
  titleMax: 28,
  fromMax: 24,
  toMax: 24,
  tracksPerSide: 10,
  /** Total characters of doodle path data across all strokes. */
  doodleChars: 1500,
  misregisterMin: 0,
  misregisterMax: 8,
  /** A full tape should stay under about this many characters of URL. */
  urlBudget: 2000,
} as const;

/**
 * Defaults match the opening state of the maker in
 * `design-reference/Main.dc.html` and `JCard.dc.html`, so a fresh tape looks
 * like the design reference does on load.
 */
export const DEFAULTS = {
  shell: 'clear-green',
  reels: 'pink',
  sticker: 'strip',
  font: 'permanent-marker',
  ink: 'black',
  inks: 'pink-blue',
  misregister: 3,
  sealed: true,
} as const satisfies {
  shell: ShellId;
  reels: ReelId;
  sticker: StickerId;
  font: FontId;
  ink: InkId;
  inks: InkPairId;
  misregister: number;
  sealed: boolean;
};

/** Spotify track ids: 22 base62 characters. */
export const TRACK_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

/**
 * Doodle paths. `M` and `L` only: the doodle pad never produces a curve, and
 * keeping the grammar this small means a hand-crafted link cannot smuggle
 * anything interesting into an SVG `d` attribute.
 */
export const DOODLE_PATH_PATTERN = /^[ML0-9 ,.-]+$/;

export function makeTapeId(): string {
  return randomString(LIMITS.idLength);
}

export function emptyTape(overrides: Partial<Tape> = {}): Tape {
  return {
    v: TAPE_VERSION,
    id: makeTapeId(),
    title: '',
    from: '',
    shell: DEFAULTS.shell,
    reels: DEFAULTS.reels,
    sticker: DEFAULTS.sticker,
    font: DEFAULTS.font,
    ink: DEFAULTS.ink,
    doodles: [],
    sealed: DEFAULTS.sealed,
    cover: { inks: DEFAULTS.inks, misregister: DEFAULTS.misregister },
    sides: { a: [], b: [] },
    createdAt: Date.now(),
    ...overrides,
  };
}
