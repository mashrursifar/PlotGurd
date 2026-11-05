export type Point = readonly [x: number, y: number];

export function polygonArea(points: readonly Point[]): number {
  if (points.length < 3) {
    throw new RangeError("A polygon must have at least three points.");
  }

  let doubleArea = 0;

  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];

    if (![x1, y1, x2, y2].every(Number.isFinite)) {
      throw new RangeError("Polygon coordinates must be finite numbers.");
    }

    doubleArea += x1 * y2 - x2 * y1;
  }

  return Math.abs(doubleArea) / 2;
}
