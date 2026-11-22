import { describe, expect, it } from 'vitest';
import { hashString, seededTilt, seededUnit } from './seed';

describe('hashString', () => {
  it('is stable for the same input', () => {
    expect(hashString('k3Jd9Qm2')).toBe(hashString('k3Jd9Qm2'));
  });

  it('differs for different inputs', () => {
    expect(hashString('aaaaaaaa')).not.toBe(hashString('aaaaaaab'));
  });

  it('always returns a 32-bit unsigned number', () => {
    for (const value of ['', 'a', 'a much longer string', '🎵']) {
      const hash = hashString(value);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('seededUnit', () => {
  it('stays inside [0, 1)', () => {
    for (let i = 0; i < 400; i += 1) {
      const unit = seededUnit('tape' + i);
      expect(unit).toBeGreaterThanOrEqual(0);
      expect(unit).toBeLessThan(1);
    }
  });

  it('spreads across the range rather than clustering', () => {
    const values = Array.from({ length: 300 }, (_, i) => seededUnit('id' + i));
    const low = values.filter((value) => value < 0.5).length;
    // A fair split, give or take. This would fail on a constant or a stuck bit.
    expect(low).toBeGreaterThan(90);
    expect(low).toBeLessThan(210);
  });
});

describe('seededTilt', () => {
  it('gives the same tape the same lean every time', () => {
    expect(seededTilt('k3Jd9Qm2')).toBe(seededTilt('k3Jd9Qm2'));
  });

  it('stays within the maximum lean', () => {
    for (let i = 0; i < 400; i += 1) {
      const tilt = seededTilt('tape' + i);
      expect(Math.abs(tilt)).toBeLessThanOrEqual(0.7);
    }
  });

  it('honours a custom maximum', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(Math.abs(seededTilt('tape' + i, 2))).toBeLessThanOrEqual(2);
    }
  });

  it('leans both ways across a shelf', () => {
    const tilts = Array.from({ length: 60 }, (_, i) => seededTilt('tape' + i));
    expect(tilts.some((tilt) => tilt > 0)).toBe(true);
    expect(tilts.some((tilt) => tilt < 0)).toBe(true);
  });

  /**
   * This one caught a real bug: without an avalanche step on the hash, ids
   * that differ only in their last characters produced near-identical tilts
   * and every spine leaned the same way.
   */
  it('gives different tapes different leans', () => {
    const tilts = new Set(Array.from({ length: 40 }, (_, i) => seededTilt('tape' + i)));
    expect(tilts.size).toBeGreaterThan(8);
  });

  it('does not lean a run of similar ids the same way', () => {
    const tilts = Array.from({ length: 12 }, (_, i) => seededTilt('TESTtap' + i));
    expect(new Set(tilts).size).toBeGreaterThan(4);
  });
});
