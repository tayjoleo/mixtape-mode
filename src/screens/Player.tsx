import { useCallback, useEffect, useRef, useState } from 'react';
import Cassette, { CASSETTE_HEIGHT, CASSETTE_WIDTH } from '../components/Cassette';
import {
  CardIcon,
  DeckKey,
  FfwdIcon,
  FlipIcon,
  PauseIcon,
  PlayIcon,
  RewIcon,
  StopIcon,
} from '../components/DeckKeys';
import JCard from '../components/JCard';
import { usePlayer } from '../hooks/usePlayer';
import { logDebug } from '../lib/debug';
import { trackUri } from '../lib/trackId';
import type { Device, Me } from '../lib/spotify';
import {
  forwardAction,
  formatTime,
  indexOfPlaying,
  isEndOfSide,
  openingSide,
  OTHER_SIDE,
  progressPercent,
  rewindAction,
  sideLabel,
  type SideId,
} from '../player/playback';
import type { Tape } from '../tape/types';
import './Player.css';

type Props = {
  tape: Tape;
  me: Me | null;
  onLogin: () => void;
  onLogout: () => void;
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * True on a phone held sideways.
 *
 * `pointer: coarse` keeps a short desktop window out of it: the deck layout is
 * for a tape held in two hands, not for a browser someone has squashed.
 */
function useLandscapePhone(): boolean {
  const query = '(orientation: landscape) and (max-height: 560px) and (pointer: coarse)';
  const [isDeck, setIsDeck] = useState(() => window.matchMedia?.(query).matches ?? false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setIsDeck(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isDeck;
}

/**
 * Scales the cassette to fill the space it is given.
 *
 * The drawing is a fixed 360x228, so making it the whole screen means
 * measuring the room left over and scaling to that. A ResizeObserver rather
 * than viewport maths, because what is left depends on the deck furniture
 * above and below it rather than on the window.
 */
function useFitScale(
  ref: React.RefObject<HTMLElement | null>,
  naturalWidth: number,
  naturalHeight: number,
): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width === 0 || box.height === 0) return;

      const fit = Math.min(box.width / naturalWidth, box.height / naturalHeight);
      // Floored so rounding cannot clip the hard shadow off the edge.
      setScale(Math.max(0.35, Math.min(2.6, Math.floor(fit * 100) / 100)));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, naturalWidth, naturalHeight]);

  return scale;
}

export default function Player({ tape, me, onLogin, onLogout }: Props) {
  const loggedIn = me !== null;
  const player = usePlayer(loggedIn);
  const reducedMotion = useReducedMotion();
  const deckMode = useLandscapePhone();

  const stageRef = useRef<HTMLDivElement>(null);
  const fitScale = useFitScale(stageRef, CASSETTE_WIDTH, CASSETTE_HEIGHT);

  const [side, setSide] = useState<SideId>(() => openingSide(tape.sides));
  const [cardOpen, setCardOpen] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [sideAFinished, setSideAFinished] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);

  /**
   * Where we last asked the deck to start. Only used while the SDK has not yet
   * reported a track we recognise, so the display is not blank for the moment
   * between tapping play and the first state arriving.
   */
  const [requestedIndex, setRequestedIndex] = useState(0);

  /** Filled in by the 500ms poll, which runs between SDK events. */
  const [polled, setPolled] = useState({ uri: '', position: 0, duration: 0 });

  const sideIds = side === 'a' ? tape.sides.a : tape.sides.b;

  /* --- everything below is derived from what the deck reports ------------- */

  const state = player.state;
  const currentUri = state?.track_window.current_track.uri ?? '';
  const playing = state !== null && !state.paused;

  const foundIndex = indexOfPlaying(currentUri, sideIds);
  const index = foundIndex ?? requestedIndex;

  // The poll advances between SDK events; the SDK is authoritative whenever it
  // has just spoken. Comparing the URI keeps a stale poll from leaking into the
  // next track.
  const livePosition = state?.position ?? 0;
  const liveDuration = state?.duration ?? 0;
  const position =
    polled.uri === currentUri && polled.position > livePosition ? polled.position : livePosition;
  const duration = liveDuration || polled.duration;

  const atEndOfSide = isEndOfSide(
    { paused: state?.paused ?? true, position: livePosition, duration: liveDuration, currentUri },
    sideIds,
    hasStarted,
  );

  // Finishing Side A lifts the seal, and it stays lifted. This is the one bit
  // of the end of a side that has to be remembered rather than recomputed.
  if (atEndOfSide && side === 'a' && !sideAFinished) setSideAFinished(true);

  // The seal lifts by peeking, or by Side A running out. Either way it never
  // comes back down: the tracklist stays one tap away from then on.
  const unsealed = !tape.sealed || peeked || sideAFinished;

  // Spec section 6: poll every 500ms while playing, because the SDK only
  // pushes state on changes and the progress bar has to move in between.
  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      void player.getState().then((latest) => {
        if (!latest) return;
        setPolled({
          uri: latest.track_window.current_track.uri,
          position: latest.position,
          duration: latest.duration,
        });
      });
    }, 500);

    return () => window.clearInterval(timer);
  }, [playing, player]);

  /* --- controls ----------------------------------------------------------- */

  const start = useCallback(
    async (from: number, which: SideId = side) => {
      const ids = which === 'a' ? tape.sides.a : tape.sides.b;
      if (ids.length === 0) return;

      setHasStarted(true);
      setRequestedIndex(from);
      setPolled({ uri: '', position: 0, duration: 0 });
      await player.play(ids.map(trackUri), from);
    },
    [player, side, tape.sides.a, tape.sides.b],
  );

  const onPlayPause = useCallback(async () => {
    // Nothing queued yet, or the side has run out: start it from the top.
    if (!hasStarted || atEndOfSide) {
      await start(atEndOfSide ? 0 : index);
      return;
    }
    await player.toggle();
  }, [atEndOfSide, hasStarted, index, player, start]);

  const onRewind = useCallback(async () => {
    const action = rewindAction(position, index);
    logDebug('app', 'Rewind: ' + action);

    if (action === 'restart') await player.seek(0);
    else if (action === 'previous') await player.previous();
  }, [index, player, position]);

  const onForward = useCallback(async () => {
    const action = forwardAction(index, sideIds.length);
    logDebug('app', 'Fast forward: ' + action);

    if (action === 'next') {
      await player.next();
      return;
    }

    // Nothing after the last track. Stopping here is what ends the side.
    await player.pause();
    await player.seek(0);
  }, [index, player, sideIds.length]);

  const onStop = useCallback(async () => {
    logDebug('app', 'Stop');
    await player.pause();
    await player.seek(0);
  }, [player]);

  const flip = useCallback(
    async (andPlay: boolean) => {
      const next = OTHER_SIDE[side];
      logDebug('app', 'Flipping to side ' + sideLabel(next));

      setSide(next);
      setRequestedIndex(0);
      setPolled({ uri: '', position: 0, duration: 0 });

      if (andPlay && loggedIn) await start(0, next);
      else setHasStarted(false);
    },
    [loggedIn, side, start],
  );

  const onSpotifyApp = useCallback(async () => {
    const found = await player.playInSpotifyApp(sideIds.map(trackUri), index);
    setDevices(found);
  }, [index, player, sideIds]);

  /* --- presentation ------------------------------------------------------- */

  const hasSideB = tape.sides.b.length > 0;
  const otherLabel = sideLabel(OTHER_SIDE[side]);
  const deckWarming = loggedIn && player.status !== 'ready' && player.status !== 'ready-timeout';
  const deckFailed = player.status === 'ready-timeout' || player.status === 'error';
  const canPlay = player.status === 'ready' && sideIds.length > 0;

  /* --- a phone held sideways: the tape is the screen ---------------------- */

  if (deckMode) {
    return (
      <div className="mm-deck">
        <div className="mm-deck__readout">
          <span className="mm-deck__counter">
            Side {sideLabel(side)} · Track {Math.min(index + 1, sideIds.length)} of {sideIds.length}
          </span>
          <span className="mm-deck__time">
            {formatTime(position)} / {formatTime(duration)}
          </span>
        </div>

        {/* The tape fills everything between the readout and the keys. */}
        <div className="mm-deck__window" ref={stageRef}>
          <Cassette
            shell={tape.shell}
            reels={tape.reels}
            sticker={tape.sticker}
            font={tape.font}
            ink={tape.ink}
            labelText={tape.title}
            side={sideLabel(side)}
            spinning={playing && !reducedMotion}
            doodles={tape.doodles}
            scale={fitScale}
          />
        </div>

        <div
          className="mm-deck__tape-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent(position, duration))}
          aria-label="How far through the song"
        >
          <div
            className="mm-deck__tape-fill"
            style={{ width: progressPercent(position, duration) + '%' }}
          />
        </div>

        {loggedIn ? (
          <div className="mm-deck__keys" role="group" aria-label="Tape controls">
            <DeckKey
              label="Rew"
              title="Rewind to the previous song"
              onPress={() => void onRewind()}
              disabled={!canPlay || !hasStarted}
            >
              <RewIcon />
            </DeckKey>

            <DeckKey
              label={playing ? 'Pause' : 'Play'}
              title={playing ? 'Pause' : 'Play'}
              onPress={() => void onPlayPause()}
              disabled={!canPlay}
              tone="play"
              latched={playing}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </DeckKey>

            <DeckKey
              label="F.Fwd"
              title="Fast forward to the next song"
              onPress={() => void onForward()}
              disabled={!canPlay || !hasStarted}
            >
              <FfwdIcon />
            </DeckKey>

            <DeckKey
              label="Stop"
              title="Stop"
              onPress={() => void onStop()}
              disabled={!canPlay || !hasStarted}
            >
              <StopIcon />
            </DeckKey>

            <DeckKey
              label="Flip"
              title={hasSideB ? 'Flip to Side ' + otherLabel : 'This tape has no Side B'}
              onPress={() => void flip(playing)}
              disabled={!hasSideB}
            >
              <FlipIcon />
            </DeckKey>

            <DeckKey
              label="J-card"
              title="Open the J-card"
              onPress={() => setCardOpen(true)}
              tone="card"
            >
              <CardIcon />
            </DeckKey>
          </div>
        ) : (
          <div className="mm-deck__keys mm-deck__keys--out">
            <button type="button" className="mm-btn mm-btn--primary" onClick={onLogin}>
              Log in with Spotify to play
            </button>
            <button type="button" className="mm-btn mm-btn--sun" onClick={() => setCardOpen(true)}>
              J-card
            </button>
          </div>
        )}

        {atEndOfSide || player.message || deckFailed ? (
          <div className="mm-deck__tray" role="status">
            {atEndOfSide ? (
              <>
                <strong>End of Side {sideLabel(side)}.</strong>{' '}
                {hasSideB ? (
                  <button type="button" className="mm-deck__inline" onClick={() => void flip(true)}>
                    Flip the tape
                  </button>
                ) : (
                  <button type="button" className="mm-deck__inline" onClick={() => void start(0)}>
                    Play it again
                  </button>
                )}
              </>
            ) : null}
            {player.message ? <span>{player.message}</span> : null}
            {deckFailed && loggedIn ? (
              <button type="button" className="mm-deck__inline" onClick={() => void onSpotifyApp()}>
                Play in my Spotify app
              </button>
            ) : null}
          </div>
        ) : null}

        <JCard
          tape={tape}
          open={cardOpen}
          onClose={() => setCardOpen(false)}
          unsealed={unsealed}
          onPeek={() => {
            logDebug('app', 'Peeked at the J-card');
            setPeeked(true);
          }}
          side={side}
          index={index}
          canLoadTracks={loggedIn}
        />
      </div>
    );
  }

  return (
    <div className="mm-player">
      <header className="mm-player__bar">
        <a className="mm-player__home" href="#/">
          MIXTAPE MODE
        </a>
        <div className="mm-player__bar-right">
          {tape.from ? <span className="mm-player__from">from {tape.from}</span> : null}
          {loggedIn ? (
            <button type="button" className="mm-nav__logout" onClick={onLogout}>
              Log out
            </button>
          ) : null}
        </div>
      </header>

      <main className="mm-player__stage">
        <div className="mm-player__deck">
          <Cassette
            shell={tape.shell}
            reels={tape.reels}
            sticker={tape.sticker}
            font={tape.font}
            ink={tape.ink}
            labelText={tape.title}
            side={sideLabel(side)}
            spinning={playing && !reducedMotion}
            doodles={tape.doodles}
            scale={1}
          />
        </div>

        <div className="mm-player__controls">
          <h1 className="mm-player__title">{tape.title || 'Untitled tape'}</h1>

          <div className="mm-player__where">
            <span className="mm-player__position">
              Side {sideLabel(side)} · Track {Math.min(index + 1, sideIds.length)} of{' '}
              {sideIds.length}
            </span>
            {reducedMotion && playing ? (
              <span className="mm-player__playing-dot">Playing</span>
            ) : null}
            {/* Never the track name, artist, album or cover art. Spec section 6. */}
            <span className="mm-player__hidden-note">
              Song names are hidden. They live inside the J-card.
            </span>
          </div>

          <div className="mm-player__progress">
            <div
              className="mm-player__bar-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercent(position, duration))}
              aria-label="How far through the song"
            >
              <div
                className="mm-player__bar-fill"
                style={{ width: progressPercent(position, duration) + '%' }}
              />
            </div>
            <div className="mm-player__times">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {loggedIn ? (
            <>
              <div className="mm-player__transport">
                <button
                  type="button"
                  className="mm-player__round"
                  onClick={() => void onRewind()}
                  disabled={!canPlay || !hasStarted}
                  aria-label="Rewind to the previous song"
                >
                  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                    <path d="M11 6 L4 12 L11 18 Z" />
                    <path d="M20 6 L13 12 L20 18 Z" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="mm-player__round mm-player__round--play"
                  onClick={() => void onPlayPause()}
                  disabled={!canPlay}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? (
                    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
                      <path d="M8 5 V19" />
                      <path d="M16 5 V19" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="34"
                      height="34"
                      aria-hidden="true"
                      className="mm-player__play-icon"
                    >
                      <path d="M8 5 L19 12 L8 19 Z" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  className="mm-player__round"
                  onClick={() => void onForward()}
                  disabled={!canPlay || !hasStarted}
                  aria-label="Fast forward to the next song"
                >
                  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                    <path d="M4 6 L11 12 L4 18 Z" />
                    <path d="M13 6 L20 12 L13 18 Z" />
                  </svg>
                </button>
              </div>

              {deckWarming ? <p className="mm-player__status">Warming up the deck...</p> : null}
            </>
          ) : (
            <button type="button" className="mm-btn mm-btn--primary mm-btn--big" onClick={onLogin}>
              Log in with Spotify to play
            </button>
          )}

          <div className="mm-player__buttons">
            <button
              type="button"
              className="mm-player__wide"
              onClick={() => void flip(playing)}
              disabled={!hasSideB}
              title={hasSideB ? undefined : 'This tape has no Side B'}
            >
              Flip to Side {otherLabel}
            </button>
            <button
              type="button"
              className="mm-player__wide mm-player__wide--sun"
              onClick={() => setCardOpen(true)}
            >
              Open the J-card
            </button>
          </div>

          {atEndOfSide ? (
            <div className="mm-player__end" role="status">
              <strong>That&apos;s the end of Side {sideLabel(side)}.</strong>
              {hasSideB ? (
                <button
                  type="button"
                  className="mm-btn mm-btn--sun"
                  onClick={() => void flip(true)}
                >
                  Flip the tape
                </button>
              ) : (
                <button type="button" className="mm-btn mm-btn--sun" onClick={() => void start(0)}>
                  Play it again
                </button>
              )}
            </div>
          ) : null}

          {player.message ? <p className="mm-player__status">{player.message}</p> : null}

          {player.autoplayBlocked ? (
            <p className="mm-player__status">
              Your browser blocked the sound. Press play once more: the tap itself is what lets
              audio start.
            </p>
          ) : null}

          {deckFailed && loggedIn ? (
            <div className="mm-player__fallback">
              <p>
                The deck on this page will not start.{' '}
                <strong>You can play through the Spotify app on your account instead.</strong> Your
                Spotify app will show the song names in that mode.
              </p>
              <button
                type="button"
                className="mm-btn mm-btn--sun"
                onClick={() => void onSpotifyApp()}
              >
                Play in my Spotify app
              </button>
              {devices?.length === 0 ? (
                <p className="mm-hint">
                  No Spotify apps are open on your account. Open Spotify on your phone or computer,
                  play anything for a second so it shows up, then try again.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>

      <JCard
        tape={tape}
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        unsealed={unsealed}
        onPeek={() => {
          logDebug('app', 'Peeked at the J-card');
          setPeeked(true);
        }}
        side={side}
        index={index}
        canLoadTracks={loggedIn}
      />
    </div>
  );
}
