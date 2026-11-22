/**
 * Doodle strokes: simplifying them, turning them into path data, and keeping
 * the whole lot inside the character budget.
 *
 * A raw pointer stroke is hundreds of points. All of that has to fit in a URL
 * alongside twenty track ids, so each stroke is thinned with
 * Ramer-Douglas-Peucker and its coordinates rounded to integers before it ever
 * reaches the tape.
 */
import { DOODLE_PATH_PATTERN, LIMITS } from './types';

export type Point = { x: number; y: number };

/** The doodle pad's coordinate space, matching the 300x80 viewBox. */
export const PAD_WIDTH = 300;
export const PAD_HEIGHT = 80;

/** Spec section 5 suggests about 1.5. */
export const SIMPLIFY_TOLERANCE = 1.5;

/** Perpendicular distance from `point` to the line through `a` and `b`. */
function perpendicularDistance(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  // Degenerate segment: fall back to plain distance from the shared endpoint.
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }

  const area = Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x);
  return area / Math.hypot(dx, dy);
}

/**
 * Ramer-Douglas-Peucker. Keeps the points that carry the shape of the stroke
 * and throws away the ones a human would not notice.
 *
 * Iterative rather than recursive: a long stroke is thousands of points, and a
 * blown stack in the maker would lose the drawing.
 */
export function simplify(points: readonly Point[], tolerance = SIMPLIFY_TOLERANCE): Point[] {
  if (points.length <= 2) return [...points];

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const segment = stack.pop();
    if (!segment) break;
    const [first, last] = segment;
    if (last <= first + 1) continue;

    const start = points[first];
    const end = points[last];
    if (!start || !end) continue;

    let furthest = -1;
    let furthestDistance = tolerance;

    for (let i = first + 1; i < last; i += 1) {
      const point = points[i];
      if (!point) continue;
      const distance = perpendicularDistance(point, start, end);
      if (distance > furthestDistance) {
        furthest = i;
        furthestDistance = distance;
      }
    }

    if (furthest !== -1) {
      keep[furthest] = true;
      stack.push([first, furthest], [furthest, last]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rounds to integers and pins the point inside the pad. */
export function snap(point: Point): Point {
  return {
    x: Math.round(clamp(point.x, 0, PAD_WIDTH)),
    y: Math.round(clamp(point.y, 0, PAD_HEIGHT)),
  };
}

/**
 * Turns points into `M`/`L` path data. A single point becomes a dot, drawn as
 * a zero-length line so `stroke-linecap: round` renders it.
 */
export function toPathData(points: readonly Point[]): string {
  if (points.length === 0) return '';

  const snapped = points.map(snap);
  const first = snapped[0];
  if (!first) return '';

  // Drop points that land on the same integer as the one before.
  const unique: Point[] = [first];
  for (const point of snapped.slice(1)) {
    const previous = unique[unique.length - 1];
    if (!previous || previous.x !== point.x || previous.y !== point.y) unique.push(point);
  }

  if (unique.length === 1) {
    return `M${first.x} ${first.y} L${first.x} ${first.y}`;
  }

  return (
    `M${first.x} ${first.y}` +
    unique
      .slice(1)
      .map((p) => ` L${p.x} ${p.y}`)
      .join('')
  );
}

/** Simplify, round and serialise a raw pointer stroke in one go. */
export function strokeToPathData(points: readonly Point[], tolerance = SIMPLIFY_TOLERANCE): string {
  return toPathData(simplify(points, tolerance));
}

/** Reads `M`/`L` path data back into points. Returns null if it is not ours. */
export function fromPathData(d: string): Point[] | null {
  if (!DOODLE_PATH_PATTERN.test(d)) return null;

  const points: Point[] = [];
  for (const command of d.split(/(?=[ML])/)) {
    const trimmed = command.trim();
    if (trimmed === '') continue;

    const numbers = trimmed
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    const [x, y] = numbers;
    if (numbers.length !== 2 || x === undefined || y === undefined) return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    points.push({ x, y });
  }

  return points.length > 0 ? points : null;
}

/** Total characters of path data across every stroke. */
export function doodleCharCount(doodles: readonly string[]): number {
  return doodles.reduce((total, path) => total + path.length, 0);
}

/**
 * Whether another stroke still fits. The maker uses this to say "That's all the
 * ink this label holds" and stop accepting strokes, rather than silently
 * dropping what someone just drew.
 */
export function canHoldMoreInk(doodles: readonly string[], nextPath = ''): boolean {
  return doodleCharCount(doodles) + nextPath.length <= LIMITS.doodleChars;
}

export function inkRemaining(doodles: readonly string[]): number {
  return Math.max(0, LIMITS.doodleChars - doodleCharCount(doodles));
}

/**
 * Trims a list of strokes to the budget, keeping whole strokes from the start.
 * Decoding uses this: a crafted link does not get to carry unlimited path data.
 */
export function capDoodles(doodles: readonly string[]): string[] {
  const kept: string[] = [];
  let used = 0;

  for (const path of doodles) {
    if (used + path.length > LIMITS.doodleChars) break;
    kept.push(path);
    used += path.length;
  }

  return kept;
}
