import { describe, expect, it } from "vitest";
import { polygonArea } from "../src/utils/geometry.js";

describe("polygonArea", () => {
  it("calculates a square", () => {
    expect(
      polygonArea([
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ]),
    ).toBe(16);
  });

  it("calculates a triangle", () => {
    expect(
      polygonArea([
        [0, 0],
        [4, 0],
        [0, 3],
      ]),
    ).toBe(6);
  });

  it("calculates an irregular polygon", () => {
    expect(
      polygonArea([
        [0, 0],
        [4, 0],
        [5, 2],
        [2, 4],
        [-1, 2],
      ]),
    ).toBe(16);
  });

  it("returns the same positive area in either winding direction", () => {
    const clockwise = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ] as const;

    expect(polygonArea(clockwise)).toBe(polygonArea([...clockwise].reverse()));
  });
});
