/**
 * Turns tape ids into the values the drawing needs.
 *
 * Every colour and size here is lifted from `design-reference/`, not invented.
 * The tape format stores ids because ids are what survive in a URL; this is
 * the one place that knows what each id looks like.
 */
import { readableInk } from '../lib/colour';
import type { FontId, InkId, InkPairId, ReelId, ShellId, StickerId } from './types';

export type ShellLook = {
  name: string;
  colour: string;
  /** A clear shell shows the tape packs, rollers and tape path through it. */
  clear: boolean;
};

/** From the `shells` list in `design-reference/Main.dc.html`. */
export const SHELLS: Record<ShellId, ShellLook> = {
  'clear-green': { name: 'Clear green', colour: 'rgba(80, 220, 140, 0.42)', clear: true },
  'clear-cyan': { name: 'Clear cyan', colour: 'rgba(60, 200, 235, 0.4)', clear: true },
  crystal: { name: 'Crystal', colour: 'rgba(240, 244, 250, 0.38)', clear: true },
  'clear-smoke': { name: 'Clear smoke', colour: 'rgba(40, 40, 52, 0.55)', clear: true },
  'hot-pink': { name: 'Hot pink', colour: '#FF3D7F', clear: false },
  sunshine: { name: 'Sunshine', colour: '#FFD23F', clear: false },
  lime: { name: 'Lime', colour: '#9BE564', clear: false },
  'jet-black': { name: 'Jet black', colour: '#1E1E24', clear: false },
};

export const REELS: Record<ReelId, { name: string; colour: string }> = {
  white: { name: 'White reels', colour: '#F5F5F5' },
  pink: { name: 'Pink reels', colour: '#FF3D7F' },
  yellow: { name: 'Yellow reels', colour: '#FFD23F' },
  grey: { name: 'Grey reels', colour: '#8A8A96' },
};

export const INKS: Record<InkId, { name: string; colour: string }> = {
  black: { name: 'Black ink', colour: '#111111' },
  red: { name: 'Red ink', colour: '#E63946' },
  blue: { name: 'Blue ink', colour: '#1D4ED8' },
  pink: { name: 'Pink ink', colour: '#D6246E' },
};

/**
 * Each handwriting face needs its own size to sit on the same label line.
 * Sizes are from the `sizes` map in `design-reference/Cassette.dc.html`.
 */
export const FONTS: Record<FontId, { name: string; family: string; labelSize: string }> = {
  'permanent-marker': {
    name: 'Permanent Marker',
    family: "'Permanent Marker', cursive",
    labelSize: '24px',
  },
  caveat: { name: 'Caveat', family: "'Caveat', cursive", labelSize: '30px' },
  'rock-salt': { name: 'Rock Salt', family: "'Rock Salt', cursive", labelSize: '17px' },
  'gochi-hand': { name: 'Gochi Hand', family: "'Gochi Hand', cursive", labelSize: '26px' },
};

export const STICKERS: Record<StickerId, { name: string }> = {
  strip: { name: 'Slim stripe' },
  lined: { name: 'Lined' },
  tape: { name: 'Masking tape' },
  retail: { name: 'Retail' },
};

/** The two riso inks, printed with `mix-blend-mode: multiply` over the paper. */
export const INK_PAIRS: Record<InkPairId, { name: string; a: string; b: string }> = {
  'pink-blue': { name: 'Pink + Blue', a: '#FF48B0', b: '#0078BF' },
  'red-green': { name: 'Red + Green', a: '#FF665E', b: '#00A95C' },
  'yellow-purple': { name: 'Yellow + Purple', a: '#FFE800', b: '#765BA7' },
  'pink-black': { name: 'Pink + Black', a: '#FF48B0', b: '#1A1A1A' },
};

/** The rack a spine sits on, which a clear shell is seen through. */
const RACK = { r: 0x2e, g: 0xc4, b: 0xf1 };

/**
 * The spine on the shelf is derived from the tape rather than stored, so it can
 * never disagree with the cassette it belongs to. See docs/DECISIONS.md.
 *
 * Shell and ink are picked independently in the maker, so black ink on a jet
 * black shell is a thing someone can make. The lettering keeps the tape's own
 * ink whenever that is legible and switches to the paper colour when it is
 * not, rather than shipping a spine nobody can read.
 */
export function spineLook(shell: ShellId, sticker: StickerId, ink: InkId) {
  const stripes = 'linear-gradient(90deg, #E63946 0 33%, #FFD23F 33% 66%, #2EC4F1 66% 100%)';
  const bands: Record<StickerId, string> = {
    strip: stripes,
    lined: '#FFFDF5',
    tape: '#EBDDB0',
    retail: '#FFD23F',
  };

  const background = SHELLS[shell].colour;

  return {
    background,
    band: bands[sticker],
    ink: readableInk(background, INKS[ink].colour, RACK),
  };
}
