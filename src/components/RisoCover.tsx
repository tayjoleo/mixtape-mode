import type { CSSProperties } from 'react';
import { INK_PAIRS } from '../tape/palette';
import type { InkPairId } from '../tape/types';
import './RisoCover.css';

/**
 * The J-card front and spine, as a two-ink riso print.
 *
 * Layering is from `design-reference/JCard.dc.html`: flat shapes in ink A and
 * ink B over a paper base, every layer on `mix-blend-mode: multiply`, with a
 * second pass offset by the misregistration so it looks like the paper went
 * through the drum twice and did not line up. That misalignment is the whole
 * charm of the thing, so it is a slider rather than a bug.
 */
export default function RisoCover({
  inks,
  misregister,
  title,
  from,
  to,
  hasSideB,
  width = 300,
}: {
  inks: InkPairId;
  misregister: number;
  title: string;
  from: string;
  to?: string | undefined;
  hasSideB: boolean;
  width?: number;
}) {
  const pair = INK_PAIRS[inks];

  const style = {
    '--riso-a': pair.a,
    '--riso-b': pair.b,
    '--riso-x': `${misregister}px`,
    '--riso-y': `${-Math.round(misregister / 2)}px`,
    '--riso-shadow': `${misregister}px ${misregister}px 0 ${pair.a}`,
    width,
  } as CSSProperties;

  return (
    <div className="mm-riso" style={style}>
      <div className="mm-riso__spine">
        <div className="mm-riso__spine-dots" aria-hidden="true" />
        <div className="mm-riso__spine-block" aria-hidden="true" />
        <div className="mm-riso__spine-text">
          <span className="mm-riso__spine-title">{title || 'Untitled'}</span>
          <span className="mm-riso__spine-length">C-60</span>
        </div>
      </div>

      <div className="mm-riso__front">
        <div className="mm-riso__halo" aria-hidden="true" />
        <div className="mm-riso__blob" aria-hidden="true" />
        <div className="mm-riso__bar" aria-hidden="true" />
        <div className="mm-riso__bar-outline" aria-hidden="true" />

        <div className="mm-riso__star" aria-hidden="true">
          <span>{hasSideB ? 'Side A + B' : 'Side A'}</span>
        </div>

        <div className="mm-riso__text">
          <h3 className="mm-riso__title">{title || 'Untitled'}</h3>
          <div className="mm-riso__credits">
            {to ? <span className="mm-riso__to">for {to}</span> : null}
            <span className="mm-riso__from">love, {from || 'someone'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
