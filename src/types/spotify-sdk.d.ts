/**
 * Minimal hand-written types for the Spotify Web Playback SDK, taken from
 * https://developer.spotify.com/documentation/web-playback-sdk/reference
 * (checked 2026-11-21). Hand-written rather than installed so we do not add a
 * dependency just for types.
 */
declare namespace Spotify {
  type WebPlaybackError = { message: string };

  type WebPlaybackPlayer = { device_id: string };

  type WebPlaybackArtist = { uri: string; name: string; url?: string };

  type WebPlaybackAlbum = {
    uri: string;
    name: string;
    images: { url: string; height?: number; width?: number }[];
  };

  type WebPlaybackTrack = {
    id: string | null;
    uri: string;
    type: string;
    media_type: string;
    name: string;
    is_playable: boolean;
    album: WebPlaybackAlbum;
    artists: WebPlaybackArtist[];
    duration_ms?: number;
  };

  type WebPlaybackState = {
    context: { uri: string | null; metadata: unknown };
    disallows: Record<string, boolean | undefined>;
    paused: boolean;
    position: number;
    duration: number;
    repeat_mode: 0 | 1 | 2;
    shuffle: boolean;
    track_window: {
      current_track: WebPlaybackTrack;
      previous_tracks: WebPlaybackTrack[];
      next_tracks: WebPlaybackTrack[];
    };
  };

  type PlayerInit = {
    name: string;
    getOAuthToken: (callback: (token: string) => void) => void;
    volume?: number;
    /**
     * Spec section 6 says not to add our own Media Session metadata, so this
     * stays off and the browser or OS shows whatever Spotify gives it.
     */
    enableMediaSession?: boolean;
  };

  type ErrorEvent =
    'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error';

  class Player {
    constructor(init: PlayerInit);

    connect(): Promise<boolean>;
    disconnect(): void;
    activateElement(): Promise<void>;

    addListener(
      event: 'ready' | 'not_ready',
      callback: (player: WebPlaybackPlayer) => void,
    ): boolean;
    addListener(
      event: 'player_state_changed',
      callback: (state: WebPlaybackState | null) => void,
    ): boolean;
    addListener(event: 'autoplay_failed', callback: () => void): boolean;
    addListener(event: ErrorEvent, callback: (error: WebPlaybackError) => void): boolean;

    removeListener(event: string, callback?: (...args: never[]) => void): boolean;

    getCurrentState(): Promise<WebPlaybackState | null>;
    setName(name: string): Promise<void>;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
  }
}

interface Window {
  onSpotifyWebPlaybackSDKReady?: () => void;
  Spotify?: { Player: typeof Spotify.Player };
}
