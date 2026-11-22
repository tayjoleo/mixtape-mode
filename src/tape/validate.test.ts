import { describe, expect, it } from 'vitest';
import { clampText, cleanDoodles, cleanTrackIds, coerceTape, type WireTape } from './validate';
import { doodleCharCount } from './doodles';
import {
  DEFAULTS,
  FONT_IDS,
  INK_IDS,
  INK_PAIR_IDS,
  LIMITS,
  REEL_IDS,
  SHELL_IDS,
  STICKER_IDS,
} from './types';

const ID_A = 'A'.repeat(22);
const ID_B = 'B'.repeat(22);
const ID_C = '2PpruBYCo4H7WOBJ7Q2EwM';

describe('clampText', () => {
  it('keeps ordinary text', () => {
    expect(clampText('Kitchen Dance Party', 28)).toBe('Kitchen Dance Party');
  });

  it('cuts to the maximum', () => {
    expect(clampText('x'.repeat(100), 28)).toHaveLength(28);
  });

  it('counts emoji as one character instead of slicing them in half', () => {
    const result = clampText('🎵🎵🎵🎵🎵', 3);
    expect([...result]).toHaveLength(3);
    expect(result).toBe('🎵🎵🎵');
  });

  it('trims surrounding whitespace', () => {
    expect(clampText('   Hello   ', 28)).toBe('Hello');
  });

  it('strips newlines and tabs that would wreck the label', () => {
    expect(clampText('Side\nA\tMix', 28)).toBe('SideAMix');
  });

  it('strips zero-width and bidi characters', () => {
    expect(clampText('Mix​tape‮mode', 28)).toBe('Mixtapemode');
    expect(clampText('﻿Mixtape', 28)).toBe('Mixtape');
  });

  it('returns empty for anything that is not a string', () => {
    for (const value of [null, undefined, 42, {}, [], true]) {
      expect(clampText(value, 28)).toBe('');
    }
  });

  it('is not fooled by a string of only invisibles', () => {
    expect(clampText('​​​', 28)).toBe('');
  });
});

describe('cleanTrackIds', () => {
  it('keeps well formed ids', () => {
    expect(cleanTrackIds([ID_A, ID_C])).toEqual([ID_A, ID_C]);
  });

  it('drops anything that is not a 22 character base62 id', () => {
    expect(
      cleanTrackIds([
        ID_A,
        'tooshort',
        ID_A + 'x',
        'has-a-hyphen-in-it-xxx',
        'spotify:track:' + ID_A,
        null,
        42,
        {},
        ['nested'],
      ]),
    ).toEqual([ID_A]);
  });

  it('drops a path traversal attempt dressed up as an id', () => {
    expect(cleanTrackIds(['../../etc/passwd', '%2e%2e%2f', ID_A])).toEqual([ID_A]);
  });

  it('caps at ten per side', () => {
    const many = Array.from({ length: 40 }, (_, i) => String(i).padStart(22, 'z'));
    expect(cleanTrackIds(many)).toHaveLength(LIMITS.tracksPerSide);
  });

  it('drops a repeat of the same song', () => {
    expect(cleanTrackIds([ID_A, ID_B, ID_A])).toEqual([ID_A, ID_B]);
  });

  it('returns empty for anything that is not an array', () => {
    for (const value of [null, undefined, 'abc', 42, {}]) {
      expect(cleanTrackIds(value)).toEqual([]);
    }
  });
});

describe('cleanDoodles', () => {
  it('keeps M and L path data', () => {
    expect(cleanDoodles(['M0 0 L10 10', 'M5 5 L6 6'])).toEqual(['M0 0 L10 10', 'M5 5 L6 6']);
  });

  it('drops curves, which the pad never draws', () => {
    expect(cleanDoodles(['M0 0 C1 1 2 2 3 3', 'M0 0 Q5 5 10 10', 'M0 0 L1 1'])).toEqual([
      'M0 0 L1 1',
    ]);
  });

  it('drops a path trying to smuggle markup', () => {
    expect(
      cleanDoodles([
        'M0 0 L1 1" onload="alert(1)',
        '"><script>alert(1)</script>',
        'M0 0 L1 1;fill:url(#x)',
        'M0 0 L2 2',
      ]),
    ).toEqual(['M0 0 L2 2']);
  });

  it('drops empty strings and non-strings', () => {
    expect(cleanDoodles(['', null, 42, {}, 'M1 1 L2 2'])).toEqual(['M1 1 L2 2']);
  });

  it('applies the ink cap to an oversized payload', () => {
    const many = Array.from({ length: 4000 }, () => 'M0 0 L1 1');
    expect(doodleCharCount(cleanDoodles(many))).toBeLessThanOrEqual(LIMITS.doodleChars);
  });

  it('returns empty for anything that is not an array', () => {
    expect(cleanDoodles('M0 0 L1 1')).toEqual([]);
    expect(cleanDoodles(null)).toEqual([]);
  });
});

describe('coerceTape enum fallbacks', () => {
  const base: WireTape = { v: 1, A: [ID_A] };

  it.each(SHELL_IDS)('keeps the known shell %s', (shell) => {
    expect(coerceTape({ ...base, s: shell }).shell).toBe(shell);
  });

  it.each(REEL_IDS)('keeps the known reels %s', (reels) => {
    expect(coerceTape({ ...base, r: reels }).reels).toBe(reels);
  });

  it.each(STICKER_IDS)('keeps the known sticker %s', (sticker) => {
    expect(coerceTape({ ...base, k: sticker }).sticker).toBe(sticker);
  });

  it.each(FONT_IDS)('keeps the known font %s', (font) => {
    expect(coerceTape({ ...base, n: font }).font).toBe(font);
  });

  it.each(INK_IDS)('keeps the known ink %s', (ink) => {
    expect(coerceTape({ ...base, c: ink }).ink).toBe(ink);
  });

  it.each(INK_PAIR_IDS)('keeps the known ink pair %s', (inks) => {
    expect(coerceTape({ ...base, p: inks }).cover.inks).toBe(inks);
  });

  it.each([
    ['shell', 's', 'shell'],
    ['reels', 'r', 'reels'],
    ['sticker', 'k', 'sticker'],
    ['font', 'n', 'font'],
    ['ink', 'c', 'ink'],
  ] as const)('falls back to the default %s for an unknown value', (_label, key, field) => {
    for (const bad of ['neon-orange', '', '__proto__', 42, null, {}]) {
      const tape = coerceTape({ ...base, [key]: bad });
      expect(tape[field]).toBe(DEFAULTS[field]);
    }
  });

  it('falls back to the default ink pair', () => {
    expect(coerceTape({ ...base, p: 'orange-teal' }).cover.inks).toBe(DEFAULTS.inks);
  });
});

describe('coerceTape numbers and flags', () => {
  const base: WireTape = { v: 1, A: [ID_A] };

  it('clamps misregistration into range', () => {
    expect(coerceTape({ ...base, m: -40 }).cover.misregister).toBe(LIMITS.misregisterMin);
    expect(coerceTape({ ...base, m: 999 }).cover.misregister).toBe(LIMITS.misregisterMax);
    expect(coerceTape({ ...base, m: 4 }).cover.misregister).toBe(4);
  });

  it('rounds a fractional misregistration', () => {
    expect(coerceTape({ ...base, m: 3.7 }).cover.misregister).toBe(4);
  });

  it('falls back for a misregistration that is not a usable number', () => {
    for (const bad of [NaN, Infinity, '5', null, {}]) {
      expect(coerceTape({ ...base, m: bad }).cover.misregister).toBe(DEFAULTS.misregister);
    }
  });

  it('reads the sealed flag as a boolean or as 1 and 0', () => {
    expect(coerceTape({ ...base, q: true }).sealed).toBe(true);
    expect(coerceTape({ ...base, q: false }).sealed).toBe(false);
    expect(coerceTape({ ...base, q: 1 }).sealed).toBe(true);
    expect(coerceTape({ ...base, q: 0 }).sealed).toBe(false);
  });

  it('defaults sealed to on when the flag is nonsense', () => {
    expect(coerceTape({ ...base, q: 'yes' }).sealed).toBe(DEFAULTS.sealed);
    expect(coerceTape(base).sealed).toBe(DEFAULTS.sealed);
  });

  it('replaces an implausible createdAt with now', () => {
    const now = Date.now();
    expect(coerceTape({ ...base, w: 0 }).createdAt).toBeGreaterThanOrEqual(now);
    expect(coerceTape({ ...base, w: 8.64e15 }).createdAt).toBeGreaterThanOrEqual(now);
    expect(coerceTape({ ...base, w: 'yesterday' }).createdAt).toBeGreaterThanOrEqual(now);
  });

  it('keeps a believable createdAt', () => {
    const stamp = Date.UTC(2026, 0, 15);
    expect(coerceTape({ ...base, w: stamp }).createdAt).toBe(stamp);
  });
});

describe('coerceTape strings and ids', () => {
  const base: WireTape = { v: 1, A: [ID_A] };

  it('clamps the title, from and to', () => {
    const tape = coerceTape({
      ...base,
      t: 'x'.repeat(200),
      f: 'y'.repeat(200),
      o: 'z'.repeat(200),
    });
    expect(tape.title).toHaveLength(LIMITS.titleMax);
    expect(tape.from).toHaveLength(LIMITS.fromMax);
    expect(tape.to).toHaveLength(LIMITS.toMax);
  });

  it('leaves `to` off entirely when it is empty', () => {
    expect(coerceTape(base)).not.toHaveProperty('to');
    expect(coerceTape({ ...base, o: '   ' })).not.toHaveProperty('to');
  });

  it('keeps a script tag as inert text rather than dropping the tape', () => {
    // React escapes this on render; the point is that it does not crash or
    // get silently turned into markup.
    const tape = coerceTape({ ...base, t: '<script>alert(1)</script>' });
    expect(tape.title).toBe('<script>alert(1)</script>'.slice(0, LIMITS.titleMax));
  });

  it('makes a fresh id when the one supplied is unusable', () => {
    for (const bad of ['', 'has a space', '../../etc', 'x'.repeat(64), null, 42]) {
      expect(coerceTape({ ...base, i: bad }).id).toMatch(/^[A-Za-z0-9]{8}$/);
    }
  });

  it('keeps a well formed id', () => {
    expect(coerceTape({ ...base, i: 'ab12CD34' }).id).toBe('ab12CD34');
  });

  it('never lets a prototype polluting key through', () => {
    const tape = coerceTape(JSON.parse('{"v":1,"A":["' + ID_A + '"],"__proto__":{"pwned":true}}'));
    expect(tape.sides.a).toEqual([ID_A]);
    expect(({} as Record<string, unknown>).pwned).toBeUndefined();
  });

  it('survives a completely empty object', () => {
    const tape = coerceTape({});
    expect(tape.v).toBe(1);
    expect(tape.sides).toEqual({ a: [], b: [] });
    expect(tape.shell).toBe(DEFAULTS.shell);
  });
});
