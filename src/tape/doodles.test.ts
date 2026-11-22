import { describe, expect, it } from 'vitest';
import {
  canHoldMoreInk,
  capDoodles,
  doodleCharCount,
  fromPathData,
  inkRemaining,
  PAD_HEIGHT,
  PAD_WIDTH,
  simplify,
  snap,
  strokeToPathData,
  toPathData,
  type Point,
} from './doodles';
import { DOODLE_PATH_PATTERN, LIMITS } from './types';

describe('simplify', () => {
  it('leaves one and two point strokes alone', () => {
    expect(simplify([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
    expect(
      simplify([
        { x: 1, y: 1 },
        { x: 9, y: 9 },
      ]),
    ).toHaveLength(2);
  });

  it('drops the middle of a straight line', () => {
    const straight: Point[] = Array.from({ length: 50 }, (_, i) => ({ x: i * 2, y: 10 }));
    expect(simplify(straight)).toEqual([
      { x: 0, y: 10 },
      { x: 98, y: 10 },
    ]);
  });

  it('keeps a corner', () => {
    const corner: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 20, y: 40 },
    ];
    const result = simplify(corner);
    expect(result).toContainEqual({ x: 20, y: 0 });
    expect(result.length).toBeLessThan(corner.length);
  });

  it('always keeps the first and last point', () => {
    const wobble: Point[] = Array.from({ length: 200 }, (_, i) => ({
      x: i,
      y: 40 + Math.sin(i / 4) * 12,
    }));
    const result = simplify(wobble);
    expect(result[0]).toEqual(wobble[0]);
    expect(result[result.length - 1]).toEqual(wobble[wobble.length - 1]);
  });

  it('cuts a real looking stroke down hard', () => {
    const stroke: Point[] = Array.from({ length: 600 }, (_, i) => ({
      x: i * 0.4,
      y: 40 + Math.sin(i / 30) * 20,
    }));
    expect(simplify(stroke).length).toBeLessThan(stroke.length / 10);
  });

  it('keeps more points as the tolerance tightens', () => {
    const stroke: Point[] = Array.from({ length: 300 }, (_, i) => ({
      x: i,
      y: 40 + Math.sin(i / 10) * 15,
    }));
    expect(simplify(stroke, 0.2).length).toBeGreaterThan(simplify(stroke, 5).length);
  });

  it('handles a stroke that never moves', () => {
    const stuck: Point[] = Array.from({ length: 80 }, () => ({ x: 5, y: 5 }));
    expect(simplify(stuck)).toHaveLength(2);
  });

  it('does not blow the stack on a very long stroke', () => {
    const huge: Point[] = Array.from({ length: 50_000 }, (_, i) => ({
      x: (i * 7) % PAD_WIDTH,
      y: (i * 13) % PAD_HEIGHT,
    }));
    expect(() => simplify(huge)).not.toThrow();
  });
});

describe('snap', () => {
  it('rounds to integers', () => {
    expect(snap({ x: 10.6, y: 20.4 })).toEqual({ x: 11, y: 20 });
  });

  it('pins points inside the pad', () => {
    expect(snap({ x: -40, y: -9 })).toEqual({ x: 0, y: 0 });
    expect(snap({ x: 9999, y: 9999 })).toEqual({ x: PAD_WIDTH, y: PAD_HEIGHT });
  });
});

describe('toPathData', () => {
  it('writes M then L commands', () => {
    expect(
      toPathData([
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ]),
    ).toBe('M0 0 L10 20 L30 40');
  });

  it('writes a single point as a dot', () => {
    expect(toPathData([{ x: 7, y: 8 }])).toBe('M7 8 L7 8');
  });

  it('returns empty for no points', () => {
    expect(toPathData([])).toBe('');
  });

  it('drops points that round onto the one before', () => {
    expect(
      toPathData([
        { x: 10.1, y: 10.1 },
        { x: 10.2, y: 10.3 },
        { x: 30, y: 30 },
      ]),
    ).toBe('M10 10 L30 30');
  });

  it('only ever emits integers', () => {
    const path = toPathData([
      { x: 1.4, y: 2.6 },
      { x: 88.9, y: 11.1 },
    ]);
    expect(path).not.toContain('.');
  });

  it('produces path data the validator accepts', () => {
    const path = strokeToPathData(
      Array.from({ length: 120 }, (_, i) => ({ x: i * 2.3, y: 40 + Math.sin(i / 8) * 20 })),
    );
    expect(DOODLE_PATH_PATTERN.test(path)).toBe(true);
  });
});

describe('fromPathData', () => {
  it('round trips path data', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 300, y: 80 },
    ];
    expect(fromPathData(toPathData(points))).toEqual(points);
  });

  it('rejects anything outside the M/L grammar', () => {
    expect(fromPathData('M10 10 C20 20 30 30 40 40')).toBeNull();
    expect(fromPathData('M0 0 L1 1 <script>')).toBeNull();
    expect(fromPathData('')).toBeNull();
  });

  it('rejects a command without a full pair of numbers', () => {
    expect(fromPathData('M10')).toBeNull();
    expect(fromPathData('M10 10 L20')).toBeNull();
  });
});

describe('the ink budget', () => {
  it('counts every stroke', () => {
    expect(doodleCharCount(['M0 0 L1 1', 'M2 2 L3 3'])).toBe(18);
  });

  it('reports ink remaining', () => {
    expect(inkRemaining([])).toBe(LIMITS.doodleChars);
    expect(inkRemaining(['x'.repeat(LIMITS.doodleChars)])).toBe(0);
    expect(inkRemaining(['x'.repeat(LIMITS.doodleChars + 500)])).toBe(0);
  });

  it('says when the label is full', () => {
    expect(canHoldMoreInk([], 'M0 0 L1 1')).toBe(true);
    expect(canHoldMoreInk(['x'.repeat(LIMITS.doodleChars)], 'M0 0')).toBe(false);
  });

  it('allows a stroke that lands exactly on the cap', () => {
    expect(canHoldMoreInk(['x'.repeat(LIMITS.doodleChars - 5)], '12345')).toBe(true);
    expect(canHoldMoreInk(['x'.repeat(LIMITS.doodleChars - 5)], '123456')).toBe(false);
  });

  it('caps by whole strokes rather than cutting one in half', () => {
    const stroke = 'M0 0 L1 1';
    const many = Array.from({ length: 500 }, () => stroke);
    const capped = capDoodles(many);

    expect(doodleCharCount(capped)).toBeLessThanOrEqual(LIMITS.doodleChars);
    expect(capped.every((path) => path === stroke)).toBe(true);
  });

  it('drops a single stroke that is over the cap by itself', () => {
    expect(capDoodles(['x'.repeat(LIMITS.doodleChars + 1)])).toEqual([]);
  });
});
