import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

describe('parseRoute', () => {
  it('reads the shelf', () => {
    expect(parseRoute('')).toEqual({ name: 'shelf' });
    expect(parseRoute('#')).toEqual({ name: 'shelf' });
    expect(parseRoute('#/')).toEqual({ name: 'shelf' });
  });

  it('reads the maker', () => {
    expect(parseRoute('#/make')).toEqual({ name: 'make' });
  });

  it('reads a tape and keeps the payload whole', () => {
    expect(parseRoute('#/t/N4IgbiBcCMA0IEso')).toEqual({
      name: 'tape',
      payload: 'N4IgbiBcCMA0IEso',
    });
  });

  it('keeps payload characters lz-string uses', () => {
    const payload = 'N4Ig-b_iBc+MA0$IEso.';
    expect(parseRoute('#/t/' + payload)).toEqual({ name: 'tape', payload });
  });

  it('treats a tape route with no payload as unknown', () => {
    expect(parseRoute('#/t/')).toEqual({ name: 'unknown', hash: '/t/' });
  });

  it('reports anything else as unknown', () => {
    expect(parseRoute('#/nope')).toEqual({ name: 'unknown', hash: '/nope' });
    expect(parseRoute('#/gallery')).toEqual({ name: 'unknown', hash: '/gallery' });
  });
});
