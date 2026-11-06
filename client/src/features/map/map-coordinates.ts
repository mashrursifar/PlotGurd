export type MapPoint = readonly [x: number, y: number];
export type LeafletPoint = [lat: number, lng: number];

export function toLeafletPoint([x, y]: MapPoint): LeafletPoint {
  return [y, x];
}

export function toLeafletPositions(
  points: readonly MapPoint[],
): LeafletPoint[] {
  return points.map(toLeafletPoint);
}
