import { useState } from 'react';
import AppShell from '../components/AppShell';
import { usePlayer } from '../hooks/usePlayer';
import { logDebug } from '../lib/debug';
import type { Device, Me } from '../lib/spotify';
import { parseTrackId, trackUri } from '../lib/trackId';
import { TEST_TAPE_HASH } from '../tape/testTape';
import { currentRedirectUri } from '../lib/urls';
import NotPremium from './NotPremium';

/**
 * The Milestone 1 test track: "Hey Ya!" by OutKast, the same placeholder the
 * design reference uses for Side A track 1. Verified against Spotify's public
 * oEmbed endpoint on 2026-11-21. The field below is editable so a region lock
 * on this one track cannot be mistaken for a broken player.
 */
const TEST_TRACK_ID = '2PpruBYCo4H7WOBJ7Q2EwM';

const STATUS_COPY: Record<string, string> = {
  idle: 'Not started',
  'loading-script': 'Loading the Spotify player script',
  connecting: 'Warming up the deck...',
  ready: 'Device ready',
  'ready-timeout': 'No ready event after 10 seconds',
  'account-error': 'Spotify says this account is not full Premium',
  error: 'The player hit an error',
};

export default function GoNoGo({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const player = usePlayer(true);
  const [trackInput, setTrackInput] = useState(TEST_TRACK_ID);
  const [devices, setDevices] = useState<Device[] | null>(null);

  const trackId = parseTrackId(trackInput);
  const playing = player.state !== null && !player.state.paused;

  // `account_error` is the only Premium signal left in Development Mode, and it
  // only arrives once the SDK has tried to start. See docs/DECISIONS.md.
  if (player.status === 'account-error') {
    return <NotPremium onLogout={onLogout} />;
  }

  const flagClass =
    player.status === 'ready'
      ? 'mm-flag mm-flag--ok'
      : player.status === 'connecting' || player.status === 'loading-script'
        ? 'mm-flag mm-flag--missing'
        : 'mm-flag mm-flag--bad';

  async function onPlay() {
    if (!trackId) return;
    logDebug('app', 'Play tapped', { trackId });
    await player.play([trackUri(trackId)], 0);
  }

  async function onFallback() {
    if (!trackId) return;
    logDebug('app', 'Spotify app fallback tapped', { trackId });
    const found = await player.playInSpotifyApp([trackUri(trackId)], 0);
    setDevices(found);
  }

  const offerFallback =
    player.status === 'ready-timeout' || player.status === 'error' || player.remoteMode;

  return (
    <AppShell
      right={
        <button type="button" className="mm-nav__logout" onClick={onLogout}>
          Log out
        </button>
      }
    >
      <h1>Milestone 1: go / no-go</h1>
      <p className="mm-lede">
        Four things have to work before we build anything else: the PKCE login, the <code>/me</code>{' '}
        call, a Web Playback SDK device reaching <code>ready</code>, and one track actually playing.
        Open the debug panel at the bottom right to watch it happen.
      </p>

      <section className="mm-card mm-card--wide" aria-labelledby="mm-gonogo-login">
        <div className="mm-card__head">
          <span className="mm-step">01</span>
          <h2 id="mm-gonogo-login">Login and account</h2>
        </div>
        <dl className="mm-facts">
          <dt>Logged in as</dt>
          <dd>
            {me.display_name ?? me.id} <span className="mm-flag mm-flag--ok">ok</span>
          </dd>

          <dt>Spotify id</dt>
          <dd>
            <code>{me.id}</code>
          </dd>

          <dt>Guest list</dt>
          <dd>
            <span className="mm-flag mm-flag--ok">on it</span> A non-listed account gets a 403 from{' '}
            <code>/me</code> and never reaches this screen.
          </dd>

          <dt>Premium</dt>
          <dd>
            {me.product ? (
              <>
                <code>{me.product}</code>{' '}
                <span
                  className={
                    me.product === 'premium' ? 'mm-flag mm-flag--ok' : 'mm-flag mm-flag--bad'
                  }
                >
                  {me.product === 'premium' ? 'full premium' : 'not full premium'}
                </span>
              </>
            ) : (
              <>
                <span className="mm-flag mm-flag--missing">cannot check here</span> Development Mode
                removed <code>product</code> from <code>/me</code> in February 2026. A non-Premium
                account shows up as the SDK&apos;s <code>account_error</code> below instead.
              </>
            )}
          </dd>

          <dt>Redirect URI sent</dt>
          <dd>
            <code>{currentRedirectUri()}</code>
          </dd>
        </dl>
      </section>

      <section className="mm-card mm-card--wide" aria-labelledby="mm-gonogo-deck">
        <div className="mm-card__head">
          <span className="mm-step">02</span>
          <h2 id="mm-gonogo-deck">The deck</h2>
        </div>
        <dl className="mm-facts">
          <dt>SDK status</dt>
          <dd>
            <span className={flagClass}>{player.status}</span>{' '}
            {STATUS_COPY[player.status] ?? player.status}
          </dd>

          <dt>Device id</dt>
          <dd>{player.deviceId ? <code>{player.deviceId}</code> : 'none yet'}</dd>

          <dt>Browser</dt>
          <dd>{player.isPhone ? 'Looks like a phone' : 'Looks like a desktop'}</dd>
        </dl>

        {player.message ? <p className="mm-note">{player.message}</p> : null}

        {player.autoplayBlocked ? (
          <p className="mm-note">
            The browser blocked autoplay. Tap play again; the tap itself is what lets audio start.
          </p>
        ) : null}
      </section>

      <section className="mm-card mm-card--wide" aria-labelledby="mm-gonogo-play">
        <div className="mm-card__head">
          <span className="mm-step">03</span>
          <h2 id="mm-gonogo-play">Play one track</h2>
        </div>

        <div className="mm-field">
          <label htmlFor="mm-track">Track id, Spotify URI or link</label>
          <input
            id="mm-track"
            type="text"
            value={trackInput}
            onChange={(event) => setTrackInput(event.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <p className="mm-hint">
          {trackId ? (
            <>
              Will play <code>{trackUri(trackId)}</code>
            </>
          ) : (
            'That is not a track id, URI or link.'
          )}
        </p>

        <div className="mm-btn-row">
          <button
            type="button"
            className="mm-btn mm-btn--primary mm-btn--big"
            onClick={() => void onPlay()}
            disabled={player.status !== 'ready' || !trackId}
          >
            Play the test track
          </button>
          <button
            type="button"
            className="mm-btn"
            onClick={() => void player.toggle()}
            disabled={player.status !== 'ready' || player.state === null}
          >
            {playing ? 'Pause' : 'Resume'}
          </button>
        </div>

        {player.state ? (
          <p className="mm-note">
            Playing {playing ? 'now' : 'is paused'} at {Math.round(player.state.position / 1000)}s
            of {Math.round(player.state.duration / 1000)}s. Shuffle{' '}
            {player.state.shuffle ? 'ON, which is wrong' : 'off'}, repeat mode{' '}
            {player.state.repeat_mode}.
          </p>
        ) : null}
      </section>

      <section className="mm-card mm-card--wide" aria-labelledby="mm-gonogo-tape">
        <div className="mm-card__head">
          <span className="mm-step">M3</span>
          <h2 id="mm-gonogo-tape">The test tape</h2>
        </div>
        <p className="mm-note">
          A hardcoded tape for trying the player: four songs on Side A, three on Side B, sealed,
          with doodles on the label. It goes away once the maker can make real ones.
        </p>
        <div className="mm-btn-row">
          <a className="mm-btn mm-btn--primary" href={TEST_TAPE_HASH}>
            Play the test tape
          </a>
        </div>
      </section>

      {offerFallback ? (
        <section className="mm-card mm-card--wide" aria-labelledby="mm-gonogo-fallback">
          <div className="mm-card__head">
            <span className="mm-step">04</span>
            <h2 id="mm-gonogo-fallback">Play in my Spotify app instead</h2>
          </div>
          <p className="mm-note">
            The in-page deck did not come up. This hands the track to a Spotify app already running
            on your account and uses this page as the remote.{' '}
            <strong>Your Spotify app will show the song names in this mode.</strong>
          </p>
          <div className="mm-btn-row">
            <button
              type="button"
              className="mm-btn mm-btn--sun"
              onClick={() => void onFallback()}
              disabled={!trackId}
            >
              Play in my Spotify app
            </button>
          </div>
          {devices ? (
            devices.length === 0 ? (
              <p className="mm-note">
                No Spotify apps are open on this account. Open Spotify on your phone or computer,
                play anything for a second so it registers, then try again.
              </p>
            ) : (
              <ul className="mm-milestones">
                {devices.map((device) => (
                  <li key={device.id ?? device.name}>
                    {device.name} ({device.type}){device.is_active ? ' — active' : ''}
                    {device.is_restricted ? ' — restricted, cannot be controlled' : ''}
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}
