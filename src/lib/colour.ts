/**
 * Just enough colour maths to keep text readable.
 *
 * The shelf derives a spine's background from the tape's shell and its
 * lettering from the tape's ink. Those two are chosen independently in the
 * maker, so nothing stops someone picking black ink and a jet black shell and
 * ending up with a spine they cannot read. This works out which way round the
 * contrast falls.
 */
export type Rgb = { r: number; g: number; b: number };
export type Rgba = Rgb & { a: number };

/** Parses `#rgb`, `#rrggbb`, `rgb(...)` and `rgba(...)`. Null for anything else. */
export function parseColour(css: string): Rgba | null {
  const value = css.trim().toLowerCase();

  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
  if (short) {
    const [, r, g, b] = short;
    return {
      r: parseInt((r as string) + (r as string), 16),
      g: parseInt((g as string) + (g as string), 16),
      b: parseInt((b as string) + (b as string), 16),
      a: 1,
    };
  }

  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(value);
  if (long) {
    return {
      r: parseInt(long[1] as string, 16),
      g: parseInt(long[2] as string, 16),
      b: parseInt(long[3] as string, 16),
      a: 1,
    };
  }

  const fn = /^rgba?\(([^)]+)\)$/.exec(value);
  if (fn) {
    const parts = (fn[1] as string)
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    const [r, g, b, a] = parts;
    if (r === undefined || g === undefined || b === undefined) return null;
    if (![r, g, b].every(Number.isFinite)) return null;
    return { r, g, b, a: a === undefined || !Number.isFinite(a) ? 1 : a };
  }

  return null;
}

/** Lays a possibly translucent colour over an opaque one. */
export function composite(front: Rgba, back: Rgb): Rgb {
  const alpha = Math.min(1, Math.max(0, front.a));
  return {
    r: front.r * alpha + back.r * (1 - alpha),
    g: front.g * alpha + back.g * (1 - alpha),
    b: front.b * alpha + back.b * (1 - alpha),
  };
}

/** WCAG relative luminance, 0 for black and 1 for white. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, between 1 and 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Spec section 7 asks for at least 4.5:1 on text. */
export const MIN_TEXT_CONTRAST = 4.5;

/** The two text colours used when a chosen ink will not do. */
export const DARK_TEXT = '#111111';
export const LIGHT_TEXT = '#FFFDF5';

/**
 * Picks an ink that can actually be read on `surface`.
 *
 * The tape's own ink is kept whenever it is legible, because that is the
 * choice someone made. When it is not, this falls back to whichever of near
 * black or paper white contrasts better, rather than to a fixed one: a
 * mid-tone surface like the hot pink shell fails against white but passes
 * comfortably against black, and the reverse is true on jet black.
 *
 * `over` is what a translucent surface sits on.
 */
export function readableInk(
  surface: string,
  preferred: string,
  over: Rgb = { r: 255, g: 255, b: 255 },
): string {
  const parsedSurface = parseColour(surface);
  if (!parsedSurface) return preferred;

  const background = composite(parsedSurface, over);

  const against = (css: string): number => {
    const parsed = parseColour(css);
    if (!parsed) return 0;
    return contrastRatio(composite(parsed, background), background);
  };

  if (against(preferred) >= MIN_TEXT_CONTRAST) return preferred;
  return against(DARK_TEXT) >= against(LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;
}
