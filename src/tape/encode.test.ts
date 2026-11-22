import { describe, expect, it } from 'vitest';
import LZString from 'lz-string';
import { decodeTape, encodeTape, payloadFromHash, toWire } from './encode';
import { strokeToPathData } from './doodles';
import { DEFAULTS, LIMITS, emptyTape, type Tape } from './types';

const ID = (seed: string) => seed.repeat(22).slice(0, 22);

function fullTape(overrides: Partial<Tape> = {}): Tape {
  return emptyTape({
    id: 'k3Jd9Qm2',
    title: 'Kitchen Dance Party',
    from: 'Taylor',
    to: 'Sam',
    shell: 'clear-smoke',
    reels: 'yellow',
    sticker: 'retail',
    font: 'rock-salt',
    ink: 'blue',
    sealed: false,
    cover: { inks: 'yellow-purple', misregister: 6 },
    sides: {
      a: Array.from({ length: 10 }, (_, i) => ID(String.fromCharCode(97 + i))),
      b: Array.from({ length: 10 }, (_, i) => ID(String.fromCharCode(65 + i))),
    },
    createdAt: 1764115200000,
    ...overrides,
  });
}

describe('round trip', () => {
  it('survives a full tape unchanged', () => {
    const tape = fullTape();
    const result = decodeTape(encodeTape(tape));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tape).toEqual(tape);
  });

  it('survives a minimal tape', () => {
    const tape = emptyTape({ title: '', from: '', sides: { a: [ID('z')], b: [] } });
    const result = decodeTape(encodeTape(tape));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tape).toEqual(tape);
  });

  it('keeps side order exactly as it was', () => {
    const a = Array.from({ length: 10 }, (_, i) => ID(String.fromCharCode(97 + i)));
    const result = decodeTape(encodeTape(emptyTape({ sides: { a, b: [] } })));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tape.sides.a).toEqual(a);
  });

  it('keeps doodles exactly as they were', () => {
    const doodles = [
      strokeToPathData(Array.from({ length: 80 }, (_, i) => ({ x: i * 3, y: 40 + (i % 9) }))),
      'M12 74 L120 62 L250 74',
    ];
    const result = decodeTape(encodeTape(emptyTape({ doodles, sides: { a: [ID('q')], b: [] } })));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tape.doodles).toEqual(doodles);
  });

  it('keeps an emoji title intact', () => {
    const tape = emptyTape({ title: '🎵 Kitchen 🎉', sides: { a: [ID('q')], b: [] } });
    const result = decodeTape(encodeTape(tape));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tape.title).toBe('🎵 Kitchen 🎉');
  });

  it('restores an omitted `to` as absent rather than empty', () => {
    const tape = emptyTape({ sides: { a: [ID('q')], b: [] } });
    const result = decodeTape(encodeTape(tape));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tape).not.toHaveProperty('to');
  });
});

describe('the wire shape', () => {
  it('uses one character keys', () => {
    for (const key of Object.keys(toWire(fullTape()))) {
      expect(key).toHaveLength(1);
    }
  });

  it('leaves out what it does not need', () => {
    const wire = toWire(emptyTape({ sides: { a: [ID('q')], b: [] } }));
    expect(wire).not.toHaveProperty('o');
    expect(wire).not.toHaveProperty('d');
    expect(wire).not.toHaveProperty('B');
  });

  it('writes sealed as 1 and 0', () => {
    expect(toWire(emptyTape({ sealed: true })).q).toBe(1);
    expect(toWire(emptyTape({ sealed: false })).q).toBe(0);
  });
});

describe('the URL length budget', () => {
  it('keeps a full tape with doodles under the budget', () => {
    // Ten tracks a side plus a few doodles, which is the worst realistic case
    // short of filling the whole ink cap.
    const doodles = [
      strokeToPathData(Array.from({ length: 300 }, (_, i) => ({ x: i, y: 40 + (i % 17) }))),
      strokeToPathData(Array.from({ length: 300 }, (_, i) => ({ x: 300 - i, y: (i % 23) + 10 }))),
      'M262 30 L276 20 L290 30 L276 58 L262 30',
    ];
    const tape = fullTape({ doodles });
    const url = 'https://tayjoleo.github.io/mixtape-mode/#/t/' + encodeTape(tape);

    expect(url.length).toBeLessThan(LIMITS.urlBudget);
  });

  it('stays inside the budget even at the full ink cap', () => {
    // Pathological: every stroke different, so there is nothing to compress.
    const doodles: string[] = [];
    let used = 0;
    for (let i = 0; used < LIMITS.doodleChars - 40; i += 1) {
      const path = strokeToPathData([
        { x: (i * 7) % 300, y: (i * 11) % 80 },
        { x: (i * 13) % 300, y: (i * 5) % 80 },
        { x: (i * 3) % 300, y: (i * 19) % 80 },
      ]);
      if (used + path.length > LIMITS.doodleChars) break;
      doodles.push(path);
      used += path.length;
    }

    const url = 'https://tayjoleo.github.io/mixtape-mode/#/t/' + encodeTape(fullTape({ doodles }));

    // The budget assumes "a few doodles", so this case was expected to exceed
    // it. It does not: ten tracks a side with the label inked to the cap still
    // lands around 1,650 characters.
    expect(doodles.length).toBeGreaterThan(50);
    expect(url.length).toBeLessThan(LIMITS.urlBudget);
  });

  it('is URL safe', () => {
    expect(encodeTape(fullTape())).toMatch(/^[A-Za-z0-9+\-$_.]*$/);
  });
});

describe('decoding a hostile or broken payload', () => {
  it.each([
    ['empty', ''],
    ['whitespace', '   '],
    ['plain words', 'this is not a tape'],
    ['truncated', 'N4IgbiBcCMA0IEsog'],
    ['base64 of nothing useful', 'AAAAAAAAAAAA'],
    ['a URL', 'https://example.com/'],
  ])('reports %s as unreadable instead of throwing', (_label, payload) => {
    const result = decodeTape(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unreadable');
  });

  it('refuses a payload that is valid compression but not an object', () => {
    for (const value of ['"just a string"', '42', 'null', '[1,2,3]']) {
      const result = decodeTape(LZString.compressToEncodedURIComponent(value));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('unreadable');
    }
  });

  it('refuses an unknown format version', () => {
    for (const version of [2, 0, '1', undefined, null]) {
      const payload = LZString.compressToEncodedURIComponent(
        JSON.stringify({ v: version, A: [ID('a')] }),
      );
      const result = decodeTape(payload);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('version');
    }
  });

  it('refuses a tape with nothing left on Side A', () => {
    for (const a of [[], ['nope'], null, 'not-an-array']) {
      const payload = LZString.compressToEncodedURIComponent(JSON.stringify({ v: 1, A: a }));
      const result = decodeTape(payload);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('empty');
    }
  });

  it('rescues a tape whose Side B is rubbish but Side A is fine', () => {
    const payload = LZString.compressToEncodedURIComponent(
      JSON.stringify({ v: 1, A: [ID('a')], B: ['garbage', 42, null] }),
    );
    const result = decodeTape(payload);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tape.sides.b).toEqual([]);
  });

  it('shrugs off an enormous payload', () => {
    const huge = LZString.compressToEncodedURIComponent(
      JSON.stringify({
        v: 1,
        t: 'x'.repeat(100_000),
        A: Array.from({ length: 5000 }, () => ID('a')),
        d: Array.from({ length: 5000 }, () => 'M0 0 L1 1'),
      }),
    );
    const result = decodeTape(huge);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tape.title).toHaveLength(LIMITS.titleMax);
      // De-duplicated down to the one distinct id.
      expect(result.tape.sides.a).toHaveLength(1);
      expect(result.tape.doodles.length).toBeLessThanOrEqual(LIMITS.doodleChars);
    }
  });

  it('does not throw on any of a pile of junk', () => {
    const junk = ['%%%', '\u0000', '😀😀😀', '{}', '../../etc/passwd', 'N4Ig'.repeat(500)];
    for (const payload of junk) {
      expect(() => decodeTape(payload)).not.toThrow();
    }
  });
});

describe('the v1 fixture', () => {
  /**
   * A hand-written v1 payload, built from JSON typed out by hand rather than
   * produced by our own encoder. If a future change breaks this, it has broken
   * every link anyone has already been sent.
   */
  const V1_PAYLOAD =
    'N4IgbiBcCMA0IEsogNYGYBSATAnARQFsAmEeAF2QGkEyBjACwFMA7AAgBEBDZ2x1gBU4AnMgE9SIAGbIAKp1EAbAPZCJS5AGVOBCQGdktBY2EBaAOZDGLCasggADgmYoJLu7rJCE9ic2T3GIQJuFjITYKEUQIlaZAAjBU5aF3gsKABtEABZIgA2IlY0AAZWABkiAHZc1iIS8pwS4rLK6oBWAA5m-MKiiSzoAoqAFjKBku7y1pLhkABdeABHKDgHfycUEwSAV0YJHUg0eABBDJAifnshLYAhAE0AYSUhgAkKgHUAeWuMCrwiAFEAO5ZCRFRgAcV0ojMMnsDVyW2g7VKRQ+CAIzEYOngFSUWyytze9kBGCGRCIACsAEq0dhHDQALWuFX4c3g11O0GK0DeRlEMhw7SyGgAHgA1Z78Bn3I65EHwNDMNAXbQVMBmThizjQBCcKkAVVoOFKPnmIEByyqQ2g0FatSKDqKAF8gA';

  it('still decodes', () => {
    const result = decodeTape(V1_PAYLOAD);
    expect(result.ok).toBe(true);
  });

  it('decodes to exactly what was written', () => {
    const result = decodeTape(V1_PAYLOAD);
    if (!result.ok) throw new Error('fixture did not decode: ' + result.reason);

    expect(result.tape).toEqual({
      v: 1,
      id: 'k3Jd9Qm2',
      title: 'Kitchen Dance Party',
      from: 'Taylor',
      to: 'Sam',
      shell: 'clear-green',
      reels: 'pink',
      sticker: 'strip',
      font: 'permanent-marker',
      ink: 'black',
      doodles: ['M262 30 L276 20 L290 30 L276 58 L262 30', 'M12 74 L120 62 L250 74'],
      sealed: true,
      cover: { inks: 'pink-blue', misregister: 3 },
      sides: {
        a: ['2PpruBYCo4H7WOBJ7Q2EwM', '0eGsygTp906u18L0Oimnem', '7ouMYWpwJ422jRcDASZB7P'],
        b: ['1301WleyT98MSxVHPZCA6M', '3n3Ppam7vgaVa1iaRUc9Lp'],
      },
      createdAt: 1764115200000,
    });
  });

  it('re-encodes to something that decodes the same way', () => {
    const first = decodeTape(V1_PAYLOAD);
    if (!first.ok) throw new Error('fixture did not decode');

    const second = decodeTape(encodeTape(first.tape));
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.tape).toEqual(first.tape);
  });
});

describe('payloadFromHash', () => {
  it('pulls the payload out of a tape hash', () => {
    expect(payloadFromHash('#/t/N4IgbiBc')).toBe('N4IgbiBc');
  });

  it('returns null for any other route', () => {
    expect(payloadFromHash('#/')).toBeNull();
    expect(payloadFromHash('#/make')).toBeNull();
    expect(payloadFromHash('#/t/')).toBeNull();
    expect(payloadFromHash('')).toBeNull();
  });
});

describe('defaults', () => {
  it('matches the maker opening state in the design reference', () => {
    const tape = emptyTape();
    expect(tape.shell).toBe(DEFAULTS.shell);
    expect(tape.sticker).toBe('strip');
    expect(tape.font).toBe('permanent-marker');
    expect(tape.sealed).toBe(true);
    expect(tape.cover).toEqual({ inks: 'pink-blue', misregister: 3 });
  });

  it('gives every tape an 8 character base62 id', () => {
    expect(emptyTape().id).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(new Set(Array.from({ length: 50 }, () => emptyTape().id)).size).toBe(50);
  });
});
