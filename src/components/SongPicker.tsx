import { useEffect, useRef, useState } from 'react';
import { logDebug } from '../lib/debug';
import {
  getMyPlaylists,
  getPlaylistTracks,
  searchTracks,
  type Playlist,
  type Track,
} from '../lib/spotify';
import { trackLine } from '../lib/trackCache';
import { LIMITS } from '../tape/types';
import './SongPicker.css';

export type Sides = { a: string[]; b: string[] };

type Props = {
  sides: Sides;
  onChange: (next: Sides) => void;
  /** Names for the tracks already on the tape, so rows can be labelled. */
  known: Map<string, Track>;
  onLearn: (tracks: Track[]) => void;
};

const DEBOUNCE_MS = 300;

/**
 * Search and playlists, inline in the maker's Songs card.
 *
 * The maker sees full song info here. Hiding is only for the listener, and
 * only on the player: spec section 6.
 */
export default function SongPicker({ sides, onChange, known, onLearn }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [playlistId, setPlaylistId] = useState('');
  const [playlistNote, setPlaylistNote] = useState<string | null>(null);

  // Rising counter so a slow response from an old query cannot overwrite a
  // newer one.
  const requestId = useRef(0);

  // Clearing happens in the change handler rather than here: an effect that
  // resets state on the way in is a cascading render, and typing is already an
  // event we are handling.
  function onQueryChange(value: string) {
    setQuery(value);
    if (value.trim() !== '') return;

    requestId.current += 1; // abandon anything still in flight
    setResults([]);
    setNextOffset(null);
    setError(null);
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === '') return;

    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchTracks(trimmed)
        .then((page) => {
          if (requestId.current !== id) return;
          setResults(page.tracks);
          setNextOffset(page.nextOffset);
          setError(page.tracks.length === 0 ? 'Nothing found for that.' : null);
          onLearn(page.tracks);
        })
        .catch((cause: unknown) => {
          if (requestId.current !== id) return;
          logDebug('error', 'Search failed', cause);
          setError('Spotify would not search just then. Try again in a moment.');
        })
        .finally(() => {
          if (requestId.current === id) setSearching(false);
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, onLearn]);

  async function loadMore() {
    if (nextOffset === null) return;
    setSearching(true);
    try {
      const page = await searchTracks(query.trim(), nextOffset);
      setResults((current) => [...current, ...page.tracks]);
      setNextOffset(page.nextOffset);
      onLearn(page.tracks);
    } catch (cause) {
      logDebug('error', 'Could not load more results', cause);
      setError('Could not load more results.');
    } finally {
      setSearching(false);
    }
  }

  async function openPlaylists() {
    if (playlists !== null) return;
    try {
      const mine = await getMyPlaylists();
      setPlaylists(mine);
      if (mine.length === 0) setPlaylistNote('You have no playlists on this account.');
    } catch (cause) {
      logDebug('error', 'Could not load playlists', cause);
      setPlaylists([]);
      setPlaylistNote('Spotify would not hand over your playlists.');
    }
  }

  async function choosePlaylist(id: string) {
    setPlaylistId(id);
    if (id === '') return;

    setSearching(true);
    setPlaylistNote(null);
    try {
      const tracks = await getPlaylistTracks(id);
      setResults(tracks);
      setNextOffset(null);
      onLearn(tracks);

      if (tracks.length === 0) {
        // Spotify only returns contents for playlists you own or collaborate
        // on. Everything else comes back as metadata with no songs.
        setPlaylistNote(
          'No songs came back for that one. Spotify only opens up playlists you own or collaborate on, so a followed playlist will look empty here. Search for the songs instead.',
        );
      }
    } catch (cause) {
      logDebug('error', 'Could not read that playlist', cause);
      setPlaylistNote('Could not read that playlist.');
    } finally {
      setSearching(false);
    }
  }

  function add(id: string, side: 'a' | 'b') {
    const target = sides[side];
    if (target.length >= LIMITS.tracksPerSide) return;
    if (target.includes(id)) return;
    onChange({ ...sides, [side]: [...target, id] });
  }

  function remove(side: 'a' | 'b', index: number) {
    onChange({ ...sides, [side]: sides[side].filter((_, i) => i !== index) });
  }

  function move(side: 'a' | 'b', index: number, delta: number) {
    const list = [...sides[side]];
    const to = index + delta;
    if (to < 0 || to >= list.length) return;

    const moving = list[index];
    const other = list[to];
    if (moving === undefined || other === undefined) return;

    list[index] = other;
    list[to] = moving;
    onChange({ ...sides, [side]: list });
  }

  function label(id: string): { name: string; meta: string } {
    const track = known.get(id);
    if (!track) return { name: id, meta: 'Loading song details...' };
    const line = trackLine(track);
    return { name: line.name, meta: line.artists + ' · ' + line.album };
  }

  return (
    <div className="mm-picker">
      <div className="mm-picker__controls">
        <div className="mm-field">
          <label htmlFor="mm-search">Search Spotify</label>
          <input
            id="mm-search"
            type="search"
            value={query}
            placeholder="a song, an artist"
            onChange={(event) => onQueryChange(event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="mm-field">
          <label htmlFor="mm-playlists">Or from one of your playlists</label>
          <select
            id="mm-playlists"
            value={playlistId}
            onFocus={() => void openPlaylists()}
            onChange={(event) => void choosePlaylist(event.target.value)}
          >
            <option value="">{playlists === null ? 'Click to load...' : 'Pick a playlist'}</option>
            {(playlists ?? []).map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name} ({playlist.trackCount})
              </option>
            ))}
          </select>
        </div>
      </div>

      {playlistNote ? <p className="mm-picker__note">{playlistNote}</p> : null}
      {error ? <p className="mm-picker__note">{error}</p> : null}
      {searching ? <p className="mm-picker__note">Looking...</p> : null}

      {results.length > 0 ? (
        <ul className="mm-picker__results">
          {results.map((track) => {
            const line = trackLine(track);
            const onA = sides.a.includes(track.id);
            const onB = sides.b.includes(track.id);

            return (
              <li key={track.id} className="mm-picker__result">
                <div className="mm-picker__text">
                  <span className="mm-picker__name">{line.name}</span>
                  <span className="mm-picker__meta">
                    {line.artists} · {line.album}
                  </span>
                </div>
                <div className="mm-picker__adds">
                  <button
                    type="button"
                    onClick={() => add(track.id, 'a')}
                    disabled={onA || sides.a.length >= LIMITS.tracksPerSide}
                    aria-label={'Add ' + line.name + ' to Side A'}
                  >
                    {onA ? 'on A' : '+ A'}
                  </button>
                  <button
                    type="button"
                    onClick={() => add(track.id, 'b')}
                    disabled={onB || sides.b.length >= LIMITS.tracksPerSide}
                    aria-label={'Add ' + line.name + ' to Side B'}
                  >
                    {onB ? 'on B' : '+ B'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {nextOffset !== null ? (
        <button
          type="button"
          className="mm-btn"
          onClick={() => void loadMore()}
          disabled={searching}
        >
          More results
        </button>
      ) : null}

      {(['a', 'b'] as const).map((side) => (
        <div key={side} className="mm-picker__side">
          <h3>
            Side {side.toUpperCase()}{' '}
            <span className="mm-picker__count">
              {sides[side].length} of {LIMITS.tracksPerSide}
            </span>
          </h3>

          {sides[side].length === 0 ? (
            <p className="mm-picker__note">
              {side === 'a' ? 'Side A needs at least one song.' : 'Side B can stay blank.'}
            </p>
          ) : (
            <ol className="mm-picker__list">
              {sides[side].map((id, index) => {
                const { name, meta } = label(id);
                return (
                  <li key={id} className="mm-picker__row">
                    <span className="mm-picker__number">{index + 1}</span>
                    <div className="mm-picker__text">
                      <span className="mm-picker__name">{name}</span>
                      <span className="mm-picker__meta">{meta}</span>
                    </div>
                    <div className="mm-picker__order">
                      <button
                        type="button"
                        onClick={() => move(side, index, -1)}
                        disabled={index === 0}
                        aria-label={'Move ' + name + ' earlier on Side ' + side.toUpperCase()}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(side, index, 1)}
                        disabled={index === sides[side].length - 1}
                        aria-label={'Move ' + name + ' later on Side ' + side.toUpperCase()}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(side, index)}
                        aria-label={'Take ' + name + ' off Side ' + side.toUpperCase()}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
