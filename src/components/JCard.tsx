import { useEffect, useRef, useState } from 'react';
import { loadTracks, trackLine, type TrackEntry } from '../lib/trackCache';
import type { Tape } from '../tape/types';
import { sideLabel, type SideId } from '../player/playback';
import RisoCover from './RisoCover';
import SpotifyMark from './SpotifyMark';
import './JCard.css';

type Props = {
  tape: Tape;
  open: boolean;
  onClose: () => void;
  /** True once the maker's seal has been lifted, by peeking or by finishing A. */
  unsealed: boolean;
  onPeek: () => void;
  side: SideId;
  index: number;
  /** Metadata only loads once someone is logged in to ask Spotify. */
  canLoadTracks: boolean;
};

function Row({
  number,
  entry,
  id,
  current,
  canLoad,
}: {
  number: number;
  entry: TrackEntry | undefined;
  id: string;
  current: boolean;
  canLoad: boolean;
}) {
  const className = 'mm-jcard__row' + (current ? ' mm-jcard__row--current' : '');

  if (entry === undefined) {
    // Without a login there is nobody to ask, so saying "Loading" would be a
    // lie that never resolves.
    return (
      <li className={className}>
        <span className="mm-jcard__number">{number}</span>
        <span className="mm-jcard__loading">
          {canLoad ? 'Loading...' : 'Log in with Spotify to see this one'}
        </span>
        <a
          className="mm-jcard__spotify"
          href={'https://open.spotify.com/track/' + id}
          target="_blank"
          rel="noreferrer noopener"
        >
          <SpotifyMark />
          <span>Spotify</span>
        </a>
      </li>
    );
  }

  if (entry.status !== 'ok') {
    return (
      <li className={className}>
        <span className="mm-jcard__number">{number}</span>
        <div className="mm-jcard__text">
          <span className="mm-jcard__name mm-jcard__name--muted">
            {entry.status === 'unavailable' ? 'Not available where you are' : 'Song unavailable'}
          </span>
          <span className="mm-jcard__meta">
            {entry.status === 'unavailable'
              ? 'This one is on the tape but Spotify will not play it in your country.'
              : 'Spotify could not find this one.'}
          </span>
        </div>
        <a
          className="mm-jcard__spotify"
          href={'https://open.spotify.com/track/' + id}
          target="_blank"
          rel="noreferrer noopener"
        >
          <SpotifyMark />
          <span>Spotify</span>
        </a>
      </li>
    );
  }

  const { name, artists, album } = trackLine(entry.track);
  const url = entry.track.external_urls.spotify ?? 'https://open.spotify.com/track/' + id;

  return (
    <li className={className}>
      <span className="mm-jcard__number">{number}</span>
      <div className="mm-jcard__text">
        {/* Name, artists and album exactly as Spotify returned them. */}
        <span className="mm-jcard__name">{name}</span>
        <span className="mm-jcard__meta">
          {artists} · {album}
        </span>
      </div>
      <a
        className="mm-jcard__spotify"
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={'Open ' + name + ' in Spotify'}
      >
        <SpotifyMark />
        <span>Spotify</span>
      </a>
    </li>
  );
}

/**
 * The J-card.
 *
 * A bottom sheet in portrait and a side panel everywhere else, which on a
 * landscape phone means the side panel, the way a real J-card unfolds
 * sideways. See docs/DECISIONS.md.
 *
 * Spotify's design rules say metadata has to stay available and legible, so the
 * seal only ever hides it behind one tap: "Peek anyway" works even while the
 * tape is sealed, and the button is always there.
 */
export default function JCard({
  tape,
  open,
  onClose,
  unsealed,
  onPeek,
  side,
  index,
  canLoadTracks,
}: Props) {
  const [entries, setEntries] = useState<ReadonlyMap<string, TrackEntry>>(new Map());
  const requested = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const showing = open && unsealed;

  // Lazily, the first time the card is actually readable. No point spending
  // twenty requests on a card nobody has opened.
  useEffect(() => {
    if (!showing || !canLoadTracks || requested.current) return;
    requested.current = true;

    const ids = [...tape.sides.a, ...tape.sides.b];
    void loadTracks(ids, setEntries).then(setEntries);
  }, [showing, canLoadTracks, tape.sides.a, tape.sides.b]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sealedCopy = tape.from
    ? `${tape.from} sealed this until Side A ends.`
    : 'This one is sealed until Side A ends.';

  return (
    <div className="mm-jcard">
      <button
        type="button"
        className="mm-jcard__scrim"
        onClick={onClose}
        tabIndex={-1}
        aria-label="Close the J-card"
      />

      <section className="mm-jcard__panel" role="dialog" aria-label="The J-card" aria-modal="true">
        <header className="mm-jcard__head">
          <h2>The J-card</h2>
          <button
            type="button"
            ref={closeRef}
            className="mm-jcard__close"
            onClick={onClose}
            aria-label="Close the J-card"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6 L18 18" />
              <path d="M18 6 L6 18" />
            </svg>
          </button>
        </header>

        {unsealed ? (
          <div className="mm-jcard__body">
            <div className="mm-jcard__cover">
              <RisoCover
                inks={tape.cover.inks}
                misregister={tape.cover.misregister}
                title={tape.title}
                from={tape.from}
                to={tape.to}
                hasSideB={tape.sides.b.length > 0}
              />
            </div>

            <div className="mm-jcard__lists">
              <h3 className="mm-jcard__side-head">Side A</h3>
              <ol className="mm-jcard__list">
                {tape.sides.a.map((id, i) => (
                  <Row
                    key={'a' + i + id}
                    number={i + 1}
                    id={id}
                    entry={entries.get(id)}
                    current={side === 'a' && index === i}
                    canLoad={canLoadTracks}
                  />
                ))}
              </ol>

              {tape.sides.b.length > 0 ? (
                <>
                  <h3 className="mm-jcard__side-head">Side B</h3>
                  <ol className="mm-jcard__list">
                    {tape.sides.b.map((id, i) => (
                      <Row
                        key={'b' + i + id}
                        number={i + 1}
                        id={id}
                        entry={entries.get(id)}
                        current={side === 'b' && index === i}
                        canLoad={canLoadTracks}
                      />
                    ))}
                  </ol>
                </>
              ) : (
                <p className="mm-jcard__no-b">Side B is blank. That happens.</p>
              )}

              {!canLoadTracks ? (
                <p className="mm-jcard__no-b">
                  Log in with Spotify to see the song names and credits.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mm-jcard__sealed">
            <span className="mm-stamp">Sealed</span>
            <p>
              {sealedCopy} The full tracklist and the Spotify credits are right inside, so you can
              peek whenever you want.
            </p>
            <button type="button" className="mm-btn mm-btn--sun" onClick={onPeek}>
              Peek anyway
            </button>
            <p className="mm-jcard__sealed-note">
              Playing Side {sideLabel('a')} to the end opens it by itself.
            </p>
          </div>
        )}

        <footer className="mm-jcard__credit">
          <SpotifyMark large />
          <span>
            Every song plays through Spotify. Song, artist and album information provided by
            Spotify.
          </span>
        </footer>
      </section>
    </div>
  );
}
