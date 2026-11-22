/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Spotify application Client ID. Public, but still not hard-coded. */
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
