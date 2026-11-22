import { describe, expect, it } from 'vitest';
import {
  composite,
  contrastRatio,
  DARK_TEXT,
  LIGHT_TEXT,
  MIN_TEXT_CONTRAST,
  parseColour,
  readableInk,
  relativeLuminance,
} from './colour';

describe('parseColour', () => {
  it('reads long hex', () => {
    expect(parseColour('#FF3D7F')).toEqual({ r: 255, g: 61, b: 127, a: 1 });
  });

  it('reads short hex', () => {
    expect(parseColour('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('reads rgb and rgba', () => {
    expect(parseColour('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    expect(parseColour('rgba(80, 220, 140, 0.42)')).toEqual({ r: 80, g: 220, b: 140, a: 0.42 });
  });

  it('returns null for anything it does not understand', () => {
    for (const value of ['', 'rebeccapurple', 'linear-gradient(90deg, red, blue)', '#12345']) {
      expect(parseColour(value)).toBeNull();
    }
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('matches the known black on white figure', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 2);
  });

  it('is 1 for a colour against itself', () => {
    expect(contrastRatio({ r: 17, g: 17, b: 17 }, { r: 17, g: 17, b: 17 })).toBeCloseTo(1, 5);
  });

  it('does not care which way round the arguments go', () => {
    const a = { r: 255, g: 210, b: 63 };
    const b = { r: 17, g: 17, b: 17 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 5);
  });
});

describe('composite', () => {
  it('leaves an opaque colour alone', () => {
    expect(composite({ r: 10, g: 20, b: 30, a: 1 }, { r: 255, g: 255, b: 255 })).toEqual({
      r: 10,
      g: 20,
      b: 30,
    });
  });

  it('returns the backdrop for a fully transparent colour', () => {
    expect(composite({ r: 10, g: 20, b: 30, a: 0 }, { r: 200, g: 100, b: 50 })).toEqual({
      r: 200,
      g: 100,
      b: 50,
    });
  });

  it('meets in the middle at half alpha', () => {
    expect(composite({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 200, g: 200, b: 200 })).toEqual({
      r: 100,
      g: 100,
      b: 100,
    });
  });
});

describe('readableInk', () => {
  const rack = { r: 0x2e, g: 0xc4, b: 0xf1 };

  it('keeps the tape ink when it is legible', () => {
    expect(readableInk('#FFD23F', '#111111', rack)).toBe('#111111');
    expect(readableInk('#9BE564', '#111111', rack)).toBe('#111111');
  });

  it('switches away from black ink on a jet black shell', () => {
    expect(readableInk('#1E1E24', '#111111', rack)).toBe(LIGHT_TEXT);
  });

  /**
   * The case the exhaustive check below caught: pink ink on the hot pink shell
   * fails, and so does white. Only near black is readable there, so a fixed
   * light fallback would have shipped an unreadable spine.
   */
  it('falls back to dark text on a mid-tone shell, not light', () => {
    expect(readableInk('#FF3D7F', '#D6246E', rack)).toBe(DARK_TEXT);
  });

  it('whatever it picks actually clears the threshold', () => {
    const shells = [
      'rgba(80, 220, 140, 0.42)',
      'rgba(60, 200, 235, 0.4)',
      'rgba(240, 244, 250, 0.38)',
      'rgba(40, 40, 52, 0.55)',
      '#FF3D7F',
      '#FFD23F',
      '#9BE564',
      '#1E1E24',
    ];
    const inks = ['#111111', '#E63946', '#1D4ED8', '#D6246E'];

    for (const shell of shells) {
      for (const ink of inks) {
        const chosen = readableInk(shell, ink, rack);
        const surface = composite(parseColour(shell)!, rack);
        const text = composite(parseColour(chosen)!, surface);
        expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      }
    }
  });
});
