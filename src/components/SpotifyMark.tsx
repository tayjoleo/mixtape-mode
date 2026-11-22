import { useState } from 'react';
import './SpotifyMark.css';

/**
 * The Spotify logo.
 *
 * Spec section 2: use the official files from Spotify's Design and Branding
 * Guidelines, and do not redraw the logo. Until those files are dropped into
 * `public/brand/`, this shows a clearly labelled placeholder instead of a
 * home-made approximation.
 *
 * It tries the real file first and falls back when the request fails, so the
 * moment the files land the placeholder disappears on its own.
 */
export default function SpotifyMark({ large = false }: { large?: boolean }) {
  const [missing, setMissing] = useState(false);
  const className = 'mm-spotify-mark' + (large ? ' mm-spotify-mark--large' : '');

  if (missing) {
    return (
      <span className={className + ' mm-spotify-mark--placeholder'} aria-hidden="true">
        [Spotify logo]
      </span>
    );
  }

  return (
    <img
      className={className}
      src={import.meta.env.BASE_URL + 'brand/spotify-logo-black.svg'}
      alt=""
      onError={() => setMissing(true)}
    />
  );
}
