import { useCallback, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import Cassette from '../components/Cassette';
import DoodlePad from '../components/DoodlePad';
import RisoCover from '../components/RisoCover';
import SongPicker, { type Sides } from '../components/SongPicker';
import { logDebug } from '../lib/debug';
import { saveToShelf } from '../lib/shelf';
import type { Me, Track } from '../lib/spotify';
import { encodeTape } from '../tape/encode';
import { FONTS, INK_PAIRS, INKS, REELS, SHELLS, STICKERS } from '../tape/palette';
import {
  emptyTape,
  FONT_IDS,
  INK_IDS,
  INK_PAIR_IDS,
  LIMITS,
  REEL_IDS,
  SHELL_IDS,
  STICKER_IDS,
  type FontId,
  type InkId,
  type InkPairId,
  type ReelId,
  type ShellId,
  type StickerId,
  type Tape,
} from '../tape/types';
import './Maker.css';

type Props = { me: Me | null; onLogin: () => void; onLogout: () => void };

export default function Maker({ me, onLogin, onLogout }: Props) {
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState(() => me?.display_name ?? '');
  const [to, setTo] = useState('');
  const [shell, setShell] = useState<ShellId>('clear-green');
  const [reels, setReels] = useState<ReelId>('pink');
  const [sticker, setSticker] = useState<StickerId>('strip');
  const [font, setFont] = useState<FontId>('permanent-marker');
  const [ink, setInk] = useState<InkId>('black');
  const [doodles, setDoodles] = useState<string[]>([]);
  const [sealed, setSealed] = useState(true);
  const [inks, setInks] = useState<InkPairId>('pink-blue');
  const [misregister, setMisregister] = useState(3);
  const [sides, setSides] = useState<Sides>({ a: [], b: [] });
  const [previewSide, setPreviewSide] = useState<'A' | 'B'>('A');
  const [spinning, setSpinning] = useState(false);

  const [known, setKnown] = useState<Map<string, Track>>(new Map());
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const learn = useCallback((tracks: Track[]) => {
    setKnown((current) => {
      const next = new Map(current);
      for (const track of tracks) next.set(track.id, track);
      return next;
    });
  }, []);

  const tape: Tape = useMemo(
    () =>
      emptyTape({
        title,
        from,
        shell,
        reels,
        sticker,
        font,
        ink,
        doodles,
        sealed,
        cover: { inks, misregister },
        sides: { a: sides.a, b: sides.b },
        ...(to.trim() === '' ? {} : { to }),
      }),
    [title, from, to, shell, reels, sticker, font, ink, doodles, sealed, inks, misregister, sides],
  );

  const canMake = sides.a.length > 0;

  function makeTape() {
    const payload = encodeTape(tape);
    const url = window.location.origin + import.meta.env.BASE_URL + '#/t/' + payload;

    saveToShelf(payload, 'made');
    setLink(url);
    logDebug('app', 'Made a tape', {
      sideA: sides.a.length,
      sideB: sides.b.length,
      urlChars: url.length,
    });
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    if (!link) return;
    try {
      await navigator.share({ title: title || 'A mixtape', url: link });
    } catch {
      // Cancelled, or sharing is unavailable. Nothing to report.
    }
  }

  return (
    <AppShell
      current="make"
      right={
        me ? (
          <button type="button" className="mm-nav__logout" onClick={onLogout}>
            Log out
          </button>
        ) : null
      }
    >
      <h1>Make a tape</h1>
      <p className="mm-lede">
        Decorate the outside however you want. The songs stay a surprise until they flip open the
        J-card.
      </p>

      <div className="mm-maker">
        <section className="mm-maker__preview" aria-label="How the tape looks">
          <div className="mm-maker__stage">
            <Cassette
              shell={shell}
              reels={reels}
              sticker={sticker}
              font={font}
              ink={ink}
              labelText={title}
              side={previewSide}
              spinning={spinning}
              doodles={doodles}
              scale={1}
            />
          </div>

          <div className="mm-btn-row">
            {(['A', 'B'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={'mm-chip' + (previewSide === s ? ' mm-chip--on' : '')}
                onClick={() => setPreviewSide(s)}
                aria-pressed={previewSide === s}
              >
                Side {s}
              </button>
            ))}
            <button type="button" className="mm-btn" onClick={() => setSpinning((v) => !v)}>
              {spinning ? 'Pause the reels' : 'Play the reels'}
            </button>
          </div>
        </section>

        <div className="mm-maker__cards">
          <Card step="01" tint="var(--mm-pink)" title="Shell">
            <div className="mm-swatches">
              {SHELL_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="mm-swatch"
                  onClick={() => setShell(id)}
                  aria-pressed={shell === id}
                  aria-label={SHELLS[id].name}
                >
                  <span
                    className={'mm-swatch__dot' + (shell === id ? ' mm-swatch__dot--on' : '')}
                    style={{ background: SHELLS[id].colour }}
                  />
                  <span className="mm-swatch__name">{SHELLS[id].name}</span>
                </button>
              ))}
            </div>

            <div className="mm-field">
              <span className="mm-field__label">Reels</span>
              <div className="mm-swatches mm-swatches--tight">
                {REEL_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={'mm-dot' + (reels === id ? ' mm-dot--on' : '')}
                    style={{ background: REELS[id].colour }}
                    onClick={() => setReels(id)}
                    aria-pressed={reels === id}
                    aria-label={REELS[id].name}
                  />
                ))}
              </div>
            </div>
          </Card>

          <Card step="02" tint="var(--mm-sunshine)" title="Sticker">
            <div className="mm-btn-row">
              {STICKER_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={'mm-chip' + (sticker === id ? ' mm-chip--on' : '')}
                  onClick={() => setSticker(id)}
                  aria-pressed={sticker === id}
                >
                  {STICKERS[id].name}
                </button>
              ))}
            </div>
          </Card>

          <Card step="03" tint="var(--mm-blue)" title="Writing">
            <div className="mm-field">
              <label htmlFor="mm-title">What goes on the label</label>
              <input
                id="mm-title"
                type="text"
                value={title}
                maxLength={LIMITS.titleMax}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Kitchen Dance Party"
              />
              <span className="mm-hint">
                {LIMITS.titleMax - title.length} characters left on the label
              </span>
            </div>

            <div className="mm-field">
              <span className="mm-field__label">Handwriting</span>
              <div className="mm-btn-row">
                {FONT_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={'mm-chip mm-chip--hand' + (font === id ? ' mm-chip--on' : '')}
                    style={{ fontFamily: FONTS[id].family }}
                    onClick={() => setFont(id)}
                    aria-pressed={font === id}
                    aria-label={FONTS[id].name}
                  >
                    Mixtape
                  </button>
                ))}
              </div>
            </div>

            <div className="mm-field">
              <span className="mm-field__label">Ink</span>
              <div className="mm-swatches mm-swatches--tight">
                {INK_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={'mm-dot' + (ink === id ? ' mm-dot--on' : '')}
                    style={{ background: INKS[id].colour }}
                    onClick={() => setInk(id)}
                    aria-pressed={ink === id}
                    aria-label={INKS[id].name}
                  />
                ))}
              </div>
            </div>

            <DoodlePad doodles={doodles} ink={ink} onChange={setDoodles} />
          </Card>

          <Card step="04" tint="var(--mm-lime)" title="J-card">
            <div className="mm-maker__cover">
              <RisoCover
                inks={inks}
                misregister={misregister}
                title={title}
                from={from}
                to={to.trim() === '' ? undefined : to}
                hasSideB={sides.b.length > 0}
                width={260}
              />
            </div>

            <div className="mm-field">
              <span className="mm-field__label">Two inks</span>
              <div className="mm-btn-row">
                {INK_PAIR_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={'mm-chip' + (inks === id ? ' mm-chip--on' : '')}
                    onClick={() => setInks(id)}
                    aria-pressed={inks === id}
                  >
                    <span className="mm-chip__inks">
                      <span style={{ background: INK_PAIRS[id].a }} />
                      <span style={{ background: INK_PAIRS[id].b }} />
                    </span>
                    {INK_PAIRS[id].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mm-field">
              <label htmlFor="mm-misregister">How far off register: {misregister}px</label>
              <input
                id="mm-misregister"
                type="range"
                min={LIMITS.misregisterMin}
                max={LIMITS.misregisterMax}
                step={1}
                value={misregister}
                onChange={(event) => setMisregister(Number(event.target.value))}
              />
            </div>

            <label className="mm-check">
              <input
                type="checkbox"
                checked={sealed}
                onChange={(event) => setSealed(event.target.checked)}
              />
              Seal the J-card until Side A ends
            </label>
            <p className="mm-note">
              Listeners can always peek. The tracklist and the Spotify credits live on the inside
              fold, one tap away.
            </p>
          </Card>

          <Card step="05" tint="var(--mm-pink)" title="Songs">
            {me ? (
              <SongPicker sides={sides} onChange={setSides} known={known} onLearn={learn} />
            ) : (
              <>
                <p className="mm-note">Log in with Spotify to search for songs.</p>
                <button type="button" className="mm-btn mm-btn--primary" onClick={onLogin}>
                  Log in with Spotify
                </button>
              </>
            )}
          </Card>

          <Card step="06" tint="var(--mm-sunshine)" title="Who it is from">
            <div className="mm-field">
              <label htmlFor="mm-from">From</label>
              <input
                id="mm-from"
                type="text"
                value={from}
                maxLength={LIMITS.fromMax}
                onChange={(event) => setFrom(event.target.value)}
                placeholder="your name"
              />
            </div>
            <div className="mm-field">
              <label htmlFor="mm-to">To (optional)</label>
              <input
                id="mm-to"
                type="text"
                value={to}
                maxLength={LIMITS.toMax}
                onChange={(event) => setTo(event.target.value)}
                placeholder="who it is for"
              />
            </div>
          </Card>

          <button
            type="button"
            className="mm-btn mm-btn--primary mm-btn--big mm-maker__make"
            onClick={makeTape}
            disabled={!canMake}
          >
            Make the tape
          </button>
          {canMake ? null : (
            <p className="mm-hint mm-maker__centred">Side A needs at least one song.</p>
          )}

          {link ? (
            <div className="mm-maker__link">
              <h2>Here is the link</h2>
              <code>{link}</code>
              <div className="mm-btn-row">
                <button
                  type="button"
                  className="mm-btn mm-btn--sun"
                  onClick={() => void copyLink()}
                >
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                {typeof navigator.share === 'function' ? (
                  <button type="button" className="mm-btn" onClick={() => void shareLink()}>
                    Share
                  </button>
                ) : null}
                <a className="mm-btn" href={'#/t/' + encodeTape(tape)}>
                  Open it
                </a>
              </div>
              <p className="mm-hint">Only people on the guest list can play it.</p>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function Card({
  step,
  tint,
  title,
  children,
}: {
  step: string;
  tint: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mm-card" aria-labelledby={'mm-card-' + step}>
      <div className="mm-card__head">
        <span className="mm-step" style={{ background: tint }}>
          {step}
        </span>
        <h2 id={'mm-card-' + step}>{title}</h2>
      </div>
      {children}
    </section>
  );
}
