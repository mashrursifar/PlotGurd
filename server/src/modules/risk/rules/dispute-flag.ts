import type { RiskRule } from "../types.js";

export const evaluateDisputeFlag: RiskRule = ({ parcel }) => {
  if (!parcel.disputeFlag) {
    return null;
  }

  return {
    ruleId: "R5",
    name: "DISPUTE_FLAG",
    points: 25,
    severity: "high",
    explanation: "An authority has marked this plot as disputed.",
    evidence: { disputeReason: parcel.disputeReason },
  };
};
