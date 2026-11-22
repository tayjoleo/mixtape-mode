import { useRef, useState } from 'react';
import {
  canHoldMoreInk,
  inkRemaining,
  PAD_HEIGHT,
  PAD_WIDTH,
  strokeToPathData,
  type Point,
} from '../tape/doodles';
import { INKS } from '../tape/palette';
import { LIMITS, type InkId } from '../tape/types';
import './DoodlePad.css';

/**
 * The doodle pad.
 *
 * Pointer events, so a mouse, a finger and a pen all work the same way, with
 * `touch-action: none` so dragging draws instead of scrolling the page.
 *
 * Strokes are collected as raw points and only simplified on release: thinning
 * mid-stroke would make the line crawl behind the pointer.
 */
export default function DoodlePad({
  doodles,
  ink,
  onChange,
}: {
  doodles: readonly string[];
  ink: InkId;
  onChange: (next: string[]) => void;
}) {
  const [current, setCurrent] = useState<Point[] | null>(null);
  const [full, setFull] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const colour = INKS[ink].colour;
  const remaining = inkRemaining(doodles);

  function pointFrom(event: React.PointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * PAD_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * PAD_HEIGHT,
    };
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (!canHoldMoreInk(doodles)) {
      setFull(true);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setCurrent([pointFrom(event)]);
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (current === null) return;
    const point = pointFrom(event);
    setCurrent((points) => (points === null ? null : [...points, point]));
  }

  function onPointerUp() {
    if (current === null) return;

    const path = strokeToPathData(current);
    setCurrent(null);
    if (path === '') return;

    if (!canHoldMoreInk(doodles, path)) {
      setFull(true);
      return;
    }

    setFull(false);
    onChange([...doodles, path]);
  }

  // The in-progress stroke is drawn unsimplified so the line keeps up.
  const livePath = current === null ? null : strokeToPathData(current, 0);

  return (
    <div className="mm-pad">
      <div className="mm-pad__head">
        <span className="mm-pad__label" id="mm-pad-label">
          Doodle on it
        </span>
        <button
          type="button"
          className="mm-pad__clear"
          onClick={() => {
            setFull(false);
            onChange([]);
          }}
          disabled={doodles.length === 0}
        >
          Clear doodles
        </button>
      </div>

      <svg
        ref={svgRef}
        className="mm-pad__surface"
        viewBox={`0 0 ${PAD_WIDTH} ${PAD_HEIGHT}`}
        role="img"
        aria-labelledby="mm-pad-label"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {doodles.length === 0 && current === null ? (
          <text x={PAD_WIDTH / 2} y={46} className="mm-pad__hint">
            draw hearts, stars, whatever
          </text>
        ) : null}

        {doodles.map((d, index) => (
          <path key={`${index}:${d.length}`} d={d} style={{ stroke: colour }} />
        ))}
        {livePath ? <path d={livePath} style={{ stroke: colour }} /> : null}
      </svg>

      <p className="mm-pad__ink" aria-live="polite">
        {full ? (
          <strong>That&apos;s all the ink this label holds.</strong>
        ) : (
          <>
            {remaining} of {LIMITS.doodleChars} ink left
          </>
        )}
      </p>
    </div>
  );
}
