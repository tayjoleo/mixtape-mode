import type { ReactNode } from 'react';
import './DeckKeys.css';

/**
 * The mechanical transport keys along the bottom of a cassette deck.
 *
 * Shaped like the real thing: chunky rectangles that physically sink when
 * pressed rather than flat buttons that change colour. PLAY stays latched down
 * while the tape runs, the way the key on a deck does.
 *
 * Only used on a phone held sideways, where the tape fills the screen and
 * these are the furniture around it.
 */
export function DeckKey({
  label,
  title,
  onPress,
  children,
  disabled = false,
  tone = 'plain',
  latched = false,
}: {
  label: string;
  title: string;
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
  tone?: 'plain' | 'play' | 'card';
  latched?: boolean;
}) {
  return (
    <button
      type="button"
      className={'mm-key mm-key--' + tone + (latched ? ' mm-key--latched' : '')}
      onClick={onPress}
      disabled={disabled}
      aria-label={title}
    >
      <span className="mm-key__icon">{children}</span>
      <span className="mm-key__label">{label}</span>
    </button>
  );
}

export function RewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 6 L4 12 L11 18 Z" />
      <path d="M20 6 L13 12 L20 18 Z" />
    </svg>
  );
}

export function FfwdIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6 L11 12 L4 18 Z" />
      <path d="M13 6 L20 12 L13 18 Z" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5 L19 12 L8 19 Z" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" />
    </svg>
  );
}

export function FlipIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mm-key__stroke">
      <path d="M4 10 A8 8 0 0 1 19 8" />
      <path d="M20 14 A8 8 0 0 1 5 16" />
      <path d="M19 3 V8 H14" />
      <path d="M5 21 V16 H10" />
    </svg>
  );
}

export function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mm-key__stroke">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M10 5 V19" />
    </svg>
  );
}
