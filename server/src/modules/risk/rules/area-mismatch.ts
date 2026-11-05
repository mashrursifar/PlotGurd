import { polygonArea } from "../../../utils/geometry.js";
import type { RiskRule } from "../types.js";

export const evaluateAreaMismatch: RiskRule = ({ parcel }, config) => {
  const computedAreaDecimal = polygonArea(parcel.polygon) * config.areaScale;
  const difference = Math.abs(computedAreaDecimal - parcel.recordedAreaDecimal);
  const percentDifference =
    parcel.recordedAreaDecimal === 0
      ? computedAreaDecimal === 0
        ? 0
        : null
      : (difference / Math.abs(parcel.recordedAreaDecimal)) * 100;
  const exceedsTolerance =
    difference > Math.abs(parcel.recordedAreaDecimal) * config.areaTolerance;

  if (!exceedsTolerance) {
    return null;
  }

  return {
    ruleId: "R4",
    name: "AREA_MISMATCH",
    points: 15,
    severity: "medium",
    explanation: "The drawn plot size does not match the recorded area.",
    evidence: {
      recordedAreaDecimal: parcel.recordedAreaDecimal,
      computedAreaDecimal,
      percentDifference,
    },
  };
};
