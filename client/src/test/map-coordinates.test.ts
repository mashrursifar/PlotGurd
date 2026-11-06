import { describe, expect, it } from "vitest";
import { toLeafletPoint, toLeafletPositions } from "../features/map/map-coordinates";

describe("map coordinate conversion", () => {
  it("converts stored [x, y] points to Leaflet [lat, lng]", () => {
    expect(toLeafletPoint([195, 92])).toEqual([92, 195]);
  });

  it("converts every road and parcel point consistently", () => {
    expect(
      toLeafletPositions([
        [0, 92],
        [1000, 92],
      ]),
    ).toEqual([
      [92, 0],
      [92, 1000],
    ]);
  });
});
