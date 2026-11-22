import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import Cassette from '../components/Cassette';
import { logDebug } from '../lib/debug';
import { readShelfTapes, removeFromShelf, type ShelfRole, type ShelfTape } from '../lib/shelf';
import { seededTilt } from '../lib/seed';
import type { Me } from '../lib/spotify';
import { FONTS, spineLook } from '../tape/palette';
import './Shelf.css';

type Props = { me: Me | null; onLogin: () => void; onLogout: () => void };

const TABS: { id: ShelfRole; name: string }[] = [
  { id: 'made', name: 'Made by me' },
  { id: 'received', name: 'Sent to me' },
];

function tapeUrlFor(payload: string): string {
  return window.location.origin + import.meta.env.BASE_URL + '#/t/' + payload;
}

/** Song counts and the seal state. "Sent to 2 people" is unknowable with no backend. */
function describe({ tape }: ShelfTape): string {
  const total = tape.sides.a.length + tape.sides.b.length;
  const songs = total === 1 ? '1 song' : total + ' songs';
  const sides =
    tape.sides.b.length === 0
      ? 'all on Side A'
      : tape.sides.a.length + ' and ' + tape.sides.b.length + ' a side';
  const seal = tape.sealed ? 'J-card sealed until Side A ends.' : 'J-card open.';

  return songs + ', ' + sides + '. ' + seal;
}

export default function Shelf({ me, onLogin, onLogout }: Props) {
  const [tab, setTab] = useState<ShelfRole>('made');
  const [tapes, setTapes] = useState<ShelfTape[]>(() => readShelfTapes());
  const [picked, setPicked] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const shown = useMemo(() => tapes.filter((item) => item.entry.role === tab), [tapes, tab]);

  // Clamp the selection when the tab changes or a tape is thrown away.
  const index = Math.min(picked, Math.max(0, shown.length - 1));
  const current = shown[index];

  useEffect(() => {
    logDebug('app', 'Opened the shelf', {
      made: tapes.filter((t) => t.entry.role === 'made').length,
      received: tapes.filter((t) => t.entry.role === 'received').length,
    });
  }, [tapes]);

  async function copyLink(payload: string) {
    try {
      await navigator.clipboard.writeText(tapeUrlFor(payload));
      setCopied(payload);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  function throwAway(payload: string) {
    removeFromShelf(payload);
    setTapes(readShelfTapes());
    setPicked(0);
  }

  return (
    <AppShell
      current="shelf"
      right={
        me ? (
          <button type="button" className="mm-nav__logout" onClick={onLogout}>
            Log out
          </button>
        ) : (
          <button type="button" className="mm-nav__logout" onClick={onLogin}>
            Log in
          </button>
        )
      }
    >
      <div className="mm-shelf__top">
        <div>
          <h1>My tapes</h1>
          <p className="mm-lede">Pull one off the shelf.</p>
        </div>

        <div className="mm-shelf__tabs" role="tablist" aria-label="Which tapes">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={'mm-tab-' + item.id}
              aria-selected={tab === item.id}
              aria-controls="mm-shelf-panel"
              className={'mm-chip' + (tab === item.id ? ' mm-chip--on' : '')}
              onClick={() => {
                setTab(item.id);
                setPicked(0);
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div
        className="mm-shelf"
        id="mm-shelf-panel"
        role="tabpanel"
        aria-labelledby={'mm-tab-' + tab}
      >
        {shown.length === 0 ? (
          /* An empty shelf is still a shelf. Keeping the rack means the page
             reads as "nothing on it yet" rather than as a missing panel. */
          <div className="mm-shelf__rack mm-shelf__rack--empty">
            <div className="mm-shelf__nothing">
              <p className="mm-shelf__nothing-line">
                {tab === 'made' ? 'Your shelf is empty.' : 'Nothing sent to you yet.'}
              </p>
              <p className="mm-shelf__nothing-note">
                {tab === 'made'
                  ? 'Make a tape and it lands here, ready to send.'
                  : 'When someone sends you a tape, opening their link puts it on this shelf.'}
              </p>
              {tab === 'made' ? (
                <a className="mm-btn mm-btn--primary" href="#/make">
                  Make a tape
                </a>
              ) : (
                <a className="mm-btn mm-btn--sun" href="#/make">
                  Make one of your own
                </a>
              )}
            </div>
            <div className="mm-shelf__edge" aria-hidden="true" />
          </div>
        ) : (
          <>
            <div className="mm-shelf__rack">
              <div className="mm-shelf__spines">
                {shown.map((item, i) => {
                  const look = spineLook(item.tape.shell, item.tape.sticker, item.tape.ink);
                  const selected = i === index;

                  return (
                    <button
                      key={item.entry.payload}
                      type="button"
                      className={'mm-spine' + (selected ? ' mm-spine--out' : '')}
                      aria-pressed={selected}
                      onClick={() => setPicked(i)}
                      style={{
                        background: look.background,
                        transform: selected
                          ? 'translateX(30px)'
                          : 'rotate(' + seededTilt(item.tape.id) + 'deg)',
                      }}
                    >
                      <span className="mm-spine__band" style={{ background: look.band }}>
                        C-60
                      </span>
                      <span
                        className="mm-spine__title"
                        style={{
                          fontFamily: FONTS[item.tape.font].family,
                          color: look.ink,
                        }}
                      >
                        {item.tape.title || 'Untitled'}
                      </span>
                      <span className="mm-spine__mark">{selected ? 'A' : ''}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mm-shelf__edge" aria-hidden="true" />
            </div>

            {current ? (
              <div className="mm-card mm-shelf__detail">
                <div className="mm-shelf__art">
                  <Cassette
                    shell={current.tape.shell}
                    reels={current.tape.reels}
                    sticker={current.tape.sticker}
                    font={current.tape.font}
                    ink={current.tape.ink}
                    labelText={current.tape.title}
                    side="A"
                    doodles={current.tape.doodles}
                    scale={0.86}
                  />
                </div>

                <h2>{current.tape.title || 'Untitled'}</h2>
                <p className="mm-note">{describe(current)}</p>
                {current.tape.from ? (
                  <p className="mm-note">
                    From {current.tape.from}
                    {current.tape.to ? ', for ' + current.tape.to : ''}.
                  </p>
                ) : null}

                <div className="mm-btn-row">
                  <a className="mm-btn mm-btn--primary" href={'#/t/' + current.entry.payload}>
                    Play
                  </a>
                  {current.entry.role === 'made' ? (
                    <a className="mm-btn" href={'#/make/' + current.entry.payload}>
                      Edit the tape
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="mm-btn mm-btn--sun"
                    onClick={() => void copyLink(current.entry.payload)}
                  >
                    {copied === current.entry.payload ? 'Copied' : 'Copy the link'}
                  </button>
                  <button
                    type="button"
                    className="mm-btn"
                    onClick={() => throwAway(current.entry.payload)}
                  >
                    Take it off the shelf
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
