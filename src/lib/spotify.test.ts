import { describe, expect, it } from 'vitest';
import { readPlaylistItems } from './spotify';

const track = (id: string, name: string) => ({
  id,
  name,
  uri: 'spotify:track:' + id,
  duration_ms: 1000,
  artists: [{ id: 'a', name: 'An Artist', uri: 'spotify:artist:a' }],
  album: { id: 'b', name: 'An Album' },
  external_urls: { spotify: 'https://open.spotify.com/track/' + id },
});

const A = track('2PpruBYCo4H7WOBJ7Q2EwM', 'Hey Ya!');
const B = track('0eGsygTp906u18L0Oimnem', 'Mr. Brightside');

/**
 * February 2026 renamed the playlist endpoint and its fields for Development
 * Mode apps. Which shape arrives depends on the app's quota mode, so the
 * reader has to cope with both.
 */
describe('readPlaylistItems', () => {
  it('reads the post-rename shape, where rows carry `item`', () => {
    expect(readPlaylistItems({ items: [{ item: A }, { item: B }] })).toEqual([A, B]);
  });

  it('reads the pre-rename shape, where rows carry `track`', () => {
    expect(readPlaylistItems({ items: [{ track: A }, { track: B }] })).toEqual([A, B]);
  });

  it('reads a whole playlist object with a nested `tracks` page', () => {
    expect(readPlaylistItems({ tracks: { items: [{ track: A }] } })).toEqual([A]);
  });

  it('reads a whole playlist object with a nested `items` page', () => {
    expect(readPlaylistItems({ items: { items: [{ item: A }] } })).toEqual([A]);
  });

  it('drops rows whose track is missing, which is what a local file looks like', () => {
    expect(readPlaylistItems({ items: [{ track: null }, { track: A }, {}] })).toEqual([A]);
  });

  it('drops podcast episodes', () => {
    const episode = { ...track('3n3Ppam7vgaVa1iaRUc9Lp', 'An Episode'), type: 'episode' };
    expect(readPlaylistItems({ items: [{ item: episode }, { item: A }] })).toEqual([A]);
  });

  it('drops a track with no usable id', () => {
    expect(readPlaylistItems({ items: [{ track: { name: 'No id' } }, { track: A }] })).toEqual([A]);
  });

  it('returns empty rather than throwing on rubbish', () => {
    for (const body of [null, undefined, 'a string', 42, [], {}, { items: null }]) {
      expect(readPlaylistItems(body)).toEqual([]);
    }
  });

  it('returns empty for a playlist whose contents were withheld', () => {
    // Spotify omits the items entirely for a playlist the user does not own.
    expect(readPlaylistItems({ name: 'Someone else playlist', id: 'x' })).toEqual([]);
  });
});
