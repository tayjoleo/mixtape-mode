import type { CSSProperties } from 'react';
import { FONTS, INKS, REELS, SHELLS } from '../tape/palette';
import type { FontId, InkId, ReelId, ShellId, StickerId } from '../tape/types';
import './Cassette.css';

/** The drawing is a fixed size and gets scaled. Spec section 7. */
export const CASSETTE_WIDTH = 372;
export const CASSETTE_HEIGHT = 240;

export type CassetteProps = {
  shell: ShellId;
  reels: ReelId;
  sticker: StickerId;
  font: FontId;
  ink: InkId;
  labelText: string;
  side: 'A' | 'B';
  spinning?: boolean;
  /** SVG path data in the 300x80 label viewBox. */
  doodles?: readonly string[];
  scale?: number;
  /**
   * Label art, for later. The tape format has no art field in v1, but keeping
   * the prop here means adding one does not mean rewriting the component.
   */
  artUrl?: string;
};

function Reel({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`mm-cassette__reel mm-cassette__reel--${side}`}>
      <div className="mm-cassette__spoke" />
      <div className="mm-cassette__spoke mm-cassette__spoke--b" />
      <div className="mm-cassette__spoke mm-cassette__spoke--c" />
      <div className="mm-cassette__hub" />
    </div>
  );
}

function Sticker({ sticker }: { sticker: StickerId }) {
  switch (sticker) {
    case 'lined':
      return (
        <div className="mm-cassette__sticker mm-cassette__sticker--lined">
          <div className="mm-cassette__sticker-rule" />
        </div>
      );

    case 'tape':
      return (
        <div className="mm-cassette__sticker mm-cassette__sticker--tape">
          <div className="mm-cassette__masking" />
        </div>
      );

    case 'retail':
      return (
        <>
          <div className="mm-cassette__sticker mm-cassette__sticker--retail" />
          <div className="mm-cassette__retail-box" />
          <div className="mm-cassette__retail-c">C</div>
          <div className="mm-cassette__retail-60">60</div>
        </>
      );

    case 'strip':
      return (
        <div className="mm-cassette__sticker mm-cassette__sticker--strip">
          <div className="mm-cassette__strip-band" />
          <div className="mm-cassette__strip-rule" />
        </div>
      );
  }
}

/**
 * The cassette.
 *
 * Geometry is a straight port of `design-reference/Cassette.dc.html`. The only
 * change is that it takes tape ids rather than raw colours, so the same tape
 * data that travels in the link drives the drawing.
 *
 * The whole thing is decorative: the label text is also rendered as real text
 * by whatever screen is showing it, so this carries `aria-hidden`.
 */
export default function Cassette({
  shell,
  reels,
  sticker,
  font,
  ink,
  labelText,
  side,
  spinning = false,
  doodles = [],
  scale = 1,
  artUrl,
}: CassetteProps) {
  const look = SHELLS[shell];

  const style = {
    width: CASSETTE_WIDTH * scale,
    height: CASSETTE_HEIGHT * scale,
    '--cassette-shell': look.colour,
    '--cassette-reel': REELS[reels].colour,
    '--cassette-ink': INKS[ink].colour,
    '--cassette-label-font': FONTS[font].family,
    '--cassette-label-size': FONTS[font].labelSize,
    '--cassette-window': look.clear ? 'rgba(255, 255, 255, 0.18)' : '#2B2B33',
    '--cassette-spin': spinning ? 'running' : 'paused',
  } as CSSProperties;

  return (
    <div className="mm-cassette" style={style} aria-hidden="true">
      <div className="mm-cassette__scaler" style={{ transform: `scale(${scale})` }}>
        <div className="mm-cassette__shell">
          {look.clear ? (
            <>
              <div className="mm-cassette__pack mm-cassette__pack--left" />
              <div className="mm-cassette__pack mm-cassette__pack--right" />
              <div className="mm-cassette__tape-path" />
              <div className="mm-cassette__roller mm-cassette__roller--left" />
              <div className="mm-cassette__roller mm-cassette__roller--right" />
              <div className="mm-cassette__guide" />
              <div className="mm-cassette__slot mm-cassette__slot--left" />
              <div className="mm-cassette__slot mm-cassette__slot--right" />
            </>
          ) : null}

          <div className="mm-cassette__halftone" />

          <div className="mm-cassette__screw mm-cassette__screw--tl" />
          <div className="mm-cassette__screw mm-cassette__screw--tr" />
          <div className="mm-cassette__screw mm-cassette__screw--bl" />
          <div className="mm-cassette__screw mm-cassette__screw--br" />

          {artUrl === undefined ? (
            <Sticker sticker={sticker} />
          ) : (
            <img className="mm-cassette__sticker" src={artUrl} alt="" />
          )}

          <div className="mm-cassette__side">{side}</div>

          {artUrl === undefined ? <div className="mm-cassette__label">{labelText}</div> : null}

          <svg className="mm-cassette__doodles" viewBox="0 0 300 80">
            {doodles.map((d, index) => (
              <path key={`${index}:${d.length}`} d={d} />
            ))}
          </svg>

          <div className="mm-cassette__window">
            <div className="mm-cassette__window-tape" />
            <div className="mm-cassette__spool mm-cassette__spool--left" />
            <div className="mm-cassette__spool mm-cassette__spool--right" />
            <Reel side="left" />
            <Reel side="right" />
          </div>

          <svg className="mm-cassette__shutter" viewBox="0 0 220 64">
            <polygon
              points="22,2 198,2 218,62 2,62"
              style={{
                fill: 'rgba(17,17,17,0.18)',
                stroke: '#111111',
                strokeWidth: 3,
                strokeLinejoin: 'round',
              }}
            />
            <circle cx="60" cy="38" r="7" style={{ fill: '#111111' }} />
            <circle cx="160" cy="38" r="7" style={{ fill: '#111111' }} />
            <rect x="96" y="28" width="8" height="14" style={{ fill: '#111111' }} />
            <rect x="116" y="28" width="8" height="14" style={{ fill: '#111111' }} />
          </svg>
        </div>
      </div>
    </div>
  );
}
