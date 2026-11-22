import { useCallback, useEffect, useRef, useState } from 'react';
import { getValidAccessToken } from '../lib/auth';
import { logDebug } from '../lib/debug';
import { loadSpotifySdk, looksLikePhone, READY_TIMEOUT_MS } from '../lib/sdk';
import {
  getDevices,
  setRepeat,
  setShuffle,
  startPlayback,
  transferPlayback,
  type Device,
} from '../lib/spotify';

export type PlayerStatus =
  | 'idle'
  | 'loading-script'
  | 'connecting'
  | 'ready'
  /** The device never reported `ready`. Offer the phone fallback. */
  | 'ready-timeout'
  /** The account is not full Premium: the SDK said so. */
  | 'account-error'
  | 'error';

export type PlayerSnapshot = {
  status: PlayerStatus;
  deviceId: string | null;
  /** User-facing message. Raw errors go to the debug panel only. */
  message: string | null;
  state: Spotify.WebPlaybackState | null;
  /** True when the SDK refused to autoplay and needs another tap. */
  autoplayBlocked: boolean;
  /** True once we have given up on the SDK and are driving a Connect device. */
  remoteMode: boolean;
};

const FRIENDLY = {
  initialization_error:
    'This browser will not run the Spotify player. Chrome, Firefox, Safari or Edge, with protected content allowed, should work.',
  authentication_error: 'Spotify would not accept the login. Try logging out and back in.',
  account_error:
    'The Spotify player needs full Premium. Mobile-only plans like Mini and Lite cannot stream through the web player.',
  playback_error: 'That track would not play. Skipping it may help.',
} as const;

/**
 * Owns the Web Playback SDK player: script load, connect, the 10 second
 * `ready` deadline from spec section 2, and the "play in my Spotify app"
 * fallback that takes over when the SDK will not come up on a phone.
 */
export function usePlayer(enabled: boolean) {
  const playerRef = useRef<Spotify.Player | null>(null);
  const readyTimerRef = useRef<number | null>(null);
  const activatedRef = useRef(false);

  const [snapshot, setSnapshot] = useState<PlayerSnapshot>({
    status: 'idle',
    deviceId: null,
    message: null,
    state: null,
    autoplayBlocked: false,
    remoteMode: false,
  });

  const patch = useCallback((next: Partial<PlayerSnapshot>) => {
    setSnapshot((current) => ({ ...current, ...next }));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;

    async function boot() {
      patch({ status: 'loading-script', message: null });

      try {
        await loadSpotifySdk();
      } catch (error) {
        logDebug('error', 'SDK script never became usable', error);
        if (!disposed) {
          patch({
            status: 'error',
            message: 'The Spotify player script did not load. Check your connection and reload.',
          });
        }
        return;
      }
      if (disposed) return;

      const Player = window.Spotify?.Player;
      if (!Player) {
        patch({ status: 'error', message: 'The Spotify player script loaded but is unusable.' });
        return;
      }

      const player = new Player({
        name: 'Mixtape Mode',
        // Called on connect and whenever the token expires, up to every hour.
        getOAuthToken: (callback) => {
          getValidAccessToken()
            .then(callback)
            .catch((error: unknown) => {
              logDebug('error', 'Could not hand a token to the SDK', error);
            });
        },
        volume: 1,
      });
      playerRef.current = player;

      player.addListener('ready', ({ device_id }) => {
        logDebug('sdk', 'ready', { device_id });
        if (readyTimerRef.current !== null) {
          window.clearTimeout(readyTimerRef.current);
          readyTimerRef.current = null;
        }
        patch({ status: 'ready', deviceId: device_id, message: null });
      });

      player.addListener('not_ready', ({ device_id }) => {
        logDebug('sdk', 'not_ready', { device_id });
        patch({ message: 'The deck went offline. It usually comes back on its own.' });
      });

      player.addListener('player_state_changed', (state) => {
        logDebug('sdk', 'player_state_changed', {
          paused: state?.paused,
          position: state?.position,
          uri: state?.track_window.current_track.uri,
        });
        patch({ state });
      });

      player.addListener('autoplay_failed', () => {
        logDebug('sdk', 'autoplay_failed');
        patch({ autoplayBlocked: true });
      });

      for (const event of [
        'initialization_error',
        'authentication_error',
        'account_error',
        'playback_error',
      ] as const) {
        player.addListener(event, ({ message }) => {
          logDebug('error', 'sdk ' + event, message);
          patch({
            status: event === 'account_error' ? 'account-error' : 'error',
            message: FRIENDLY[event],
          });
        });
      }

      patch({ status: 'connecting' });
      readyTimerRef.current = window.setTimeout(() => {
        logDebug('error', 'No ready event within ' + READY_TIMEOUT_MS + 'ms');
        setSnapshot((current) =>
          current.status === 'ready'
            ? current
            : {
                ...current,
                status: 'ready-timeout',
                message:
                  'The in-page deck will not start. You can play through the Spotify app on this account instead.',
              },
        );
      }, READY_TIMEOUT_MS);

      logDebug('sdk', 'Calling player.connect()');
      const connected = await player.connect();
      logDebug('sdk', 'player.connect() resolved', { connected });

      if (!connected && !disposed) {
        patch({ status: 'error', message: 'The Spotify player would not connect.' });
      }
    }

    void boot();

    return () => {
      disposed = true;
      if (readyTimerRef.current !== null) {
        window.clearTimeout(readyTimerRef.current);
        readyTimerRef.current = null;
      }
      if (playerRef.current) {
        logDebug('sdk', 'Disconnecting the player');
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      activatedRef.current = false;
    };
  }, [enabled, patch]);

  /**
   * Must run inside the tap handler. Browsers only allow playback to start from
   * a synchronous user gesture, and `activateElement` is what claims it.
   */
  const activate = useCallback(async () => {
    if (activatedRef.current || !playerRef.current) return;
    try {
      await playerRef.current.activateElement();
      activatedRef.current = true;
      logDebug('sdk', 'activateElement resolved');
    } catch (error) {
      logDebug('error', 'activateElement failed', error);
    }
  }, []);

  /** Starts a list of track URIs on the in-page deck. A mixtape never shuffles. */
  const play = useCallback(
    async (uris: string[], position = 0) => {
      const deviceId = snapshot.deviceId;
      if (!deviceId) {
        patch({ message: 'The deck is not ready yet.' });
        return;
      }

      await activate();

      try {
        await setShuffle(false, deviceId);
        await setRepeat('off', deviceId);
        await startPlayback({ deviceId, uris, position });
        patch({ autoplayBlocked: false, message: null });
      } catch (error) {
        logDebug('error', 'Could not start playback', error);
        patch({ message: 'Spotify would not start playback. The debug panel has the details.' });
      }
    },
    [activate, patch, snapshot.deviceId],
  );

  /**
   * The transport controls all go through the SDK rather than the Web API.
   * Playback was started with the whole side as `uris`, so the SDK's own queue
   * is exactly this side: stepping through it needs no round trip, and never
   * wanders onto a track that is not on the tape.
   */
  const toggle = useCallback(async () => {
    try {
      await playerRef.current?.togglePlay();
    } catch (error) {
      logDebug('error', 'togglePlay failed', error);
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      await playerRef.current?.pause();
    } catch (error) {
      logDebug('error', 'pause failed', error);
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      await playerRef.current?.resume();
    } catch (error) {
      logDebug('error', 'resume failed', error);
    }
  }, []);

  const next = useCallback(async () => {
    try {
      await playerRef.current?.nextTrack();
    } catch (error) {
      logDebug('error', 'nextTrack failed', error);
    }
  }, []);

  const previous = useCallback(async () => {
    try {
      await playerRef.current?.previousTrack();
    } catch (error) {
      logDebug('error', 'previousTrack failed', error);
    }
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    try {
      await playerRef.current?.seek(positionMs);
    } catch (error) {
      logDebug('error', 'seek failed', error);
    }
  }, []);

  /** Polled for the progress bar, which has to move between SDK events. */
  const getState = useCallback(async (): Promise<Spotify.WebPlaybackState | null> => {
    try {
      return (await playerRef.current?.getCurrentState()) ?? null;
    } catch (error) {
      logDebug('error', 'getCurrentState failed', error);
      return null;
    }
  }, []);

  /**
   * The phone fallback from spec section 2. Finds an active Spotify Connect
   * device and drives it, with this page acting as the remote. The listener's
   * own Spotify app will show the song names in this mode, and we say so.
   */
  const playInSpotifyApp = useCallback(
    async (uris: string[], position = 0): Promise<Device[]> => {
      try {
        const { devices } = await getDevices();
        logDebug('api', 'Found ' + devices.length + ' Connect device(s)', devices);

        const target = devices.find((device) => device.is_active) ?? devices[0];
        if (!target?.id) return devices;

        await transferPlayback(target.id, false);
        await setShuffle(false, target.id);
        await setRepeat('off', target.id);
        await startPlayback({ deviceId: target.id, uris, position });

        patch({ remoteMode: true, message: null });
        return devices;
      } catch (error) {
        logDebug('error', 'The Spotify app fallback failed', error);
        patch({ message: 'We could not reach a Spotify app on this account.' });
        return [];
      }
    },
    [patch],
  );

  return {
    ...snapshot,
    isPhone: looksLikePhone(),
    activate,
    play,
    toggle,
    pause,
    resume,
    next,
    previous,
    seek,
    getState,
    playInSpotifyApp,
  };
}
