/**
 * Reads what Leaflet actually drew, from the SVG path data, so map tests assert on the rendered
 * map instead of trusting the app's internal state.
 *
 * Leaflet (SVG renderer) emits:
 *   circle marker : "M{x-r},{y}a{r},{r} 0 1,0 {2r},0 a{r},{r} 0 1,0 {-2r},0 "  -> centre = (x + r, y)
 *   polyline      : "M{x1} {y1}L{x2} {y2}L..."                                -> vertices in drawing order
 */

export interface Point2D {
  x: number;
  y: number;
}

const CIRCLE_PATH = /^M\s*(-?[\d.]+)[ ,](-?[\d.]+)\s*a\s*(-?[\d.]+)/i;
const POLY_VERTEX = /[ML]\s*(-?[\d.]+)[ ,](-?[\d.]+)/gi;

export function circleCentre(pathData: string): Point2D {
  const match = CIRCLE_PATH.exec(pathData.trim());
  if (!match) throw new Error(`Unrecognised Leaflet circle path: "${pathData.slice(0, 60)}"`);
  const [, x, y, r] = match.map(Number);
  return { x: x + r, y };
}

export function polylineVertices(pathData: string): Point2D[] {
  const vertices = [...pathData.matchAll(POLY_VERTEX)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
  if (vertices.length === 0) throw new Error(`Unrecognised Leaflet polyline path: "${pathData.slice(0, 60)}"`);
  return vertices;
}

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Index of the candidate closest to `target`. */
export function nearestIndex(target: Point2D, candidates: readonly Point2D[]): number {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  candidates.forEach((c, i) => {
    const d = distance(target, c);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}
