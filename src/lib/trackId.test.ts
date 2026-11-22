import { describe, expect, it } from 'vitest';
import { isTrackId, parseTrackId, trackUri } from './trackId';

const ID = '2PpruBYCo4H7WOBJ7Q2EwM';

describe('isTrackId', () => {
  it('accepts a 22 character base62 id', () => {
    expect(isTrackId(ID)).toBe(true);
  });

  it.each([
    ['too short', '2PpruBYCo4H7WOBJ7Q2Ew'],
    ['too long', ID + 'x'],
    ['a hyphen', '2PpruBYCo4H7WOBJ7Q2Ew-'],
    ['a space', '2PpruBYCo4H7WOBJ7Q2Ew '],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(isTrackId(value)).toBe(false);
  });

  it.each([[null], [undefined], [42], [{}], [[ID]]])('rejects the non-string %s', (value) => {
    expect(isTrackId(value)).toBe(false);
  });
});

describe('parseTrackId', () => {
  it('passes a bare id through', () => {
    expect(parseTrackId(ID)).toBe(ID);
  });

  it('trims surrounding whitespace', () => {
    expect(parseTrackId('  ' + ID + '\n')).toBe(ID);
  });

  it('reads a spotify URI', () => {
    expect(parseTrackId('spotify:track:' + ID)).toBe(ID);
  });

  it('reads an open.spotify.com link', () => {
    expect(parseTrackId('https://open.spotify.com/track/' + ID)).toBe(ID);
  });

  it('reads a link with a query string', () => {
    expect(parseTrackId('https://open.spotify.com/track/' + ID + '?si=abc123')).toBe(ID);
  });

  it('reads a localised link', () => {
    expect(parseTrackId('https://open.spotify.com/intl-de/track/' + ID)).toBe(ID);
  });

  it.each([
    ['an album link', 'https://open.spotify.com/album/' + ID],
    ['a playlist URI', 'spotify:playlist:' + ID],
    ['a look-alike host', 'https://open.spotify.com.evil.test/track/' + ID],
    ['plain words', 'hey ya outkast'],
    ['empty', ''],
  ])('returns null for %s', (_label, value) => {
    expect(parseTrackId(value)).toBeNull();
  });
});

describe('trackUri', () => {
  it('builds the URI the player API wants', () => {
    expect(trackUri(ID)).toBe('spotify:track:' + ID);
  });
});
