/**
 * Loads the Web Playback SDK script, once per page.
 *
 * The SDK calls `window.onSpotifyWebPlaybackSDKReady` when it is ready to be
 * constructed, so that callback has to be in place before the script tag goes
 * in. There are reports of Development Mode players never reaching `ready` in
 * 2026, so everything here is logged and the wait is bounded.
 */
import { logDebug } from './debug';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
const SCRIPT_TIMEOUT_MS = 15_000;

/** Spec section 2: offer the phone fallback if the device is not ready in 10s. */
export const READY_TIMEOUT_MS = 10_000;

let loading: Promise<void> | null = null;

export class SdkLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SdkLoadError';
  }
}

export function loadSpotifySdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();

  loading ??= new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      logDebug('error', 'SDK script did not load within ' + SCRIPT_TIMEOUT_MS + 'ms');
      loading = null;
      reject(new SdkLoadError('The Spotify player script did not load.'));
    }, SCRIPT_TIMEOUT_MS);

    window.onSpotifyWebPlaybackSDKReady = () => {
      window.clearTimeout(timer);
      logDebug('sdk', 'onSpotifyWebPlaybackSDKReady fired');
      resolve();
    };

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      logDebug('error', 'SDK script failed to load', { src: SDK_URL });
      loading = null;
      reject(new SdkLoadError('The Spotify player script failed to load.'));
    };

    logDebug('sdk', 'Injecting the SDK script', { src: SDK_URL });
    document.head.append(script);
  });

  return loading;
}

/** Rough phone check, used only to decide whether to offer the app fallback. */
export function looksLikePhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
