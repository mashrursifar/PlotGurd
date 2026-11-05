import type { RiskRule } from "../types.js";

export const evaluateChainBroken: RiskRule = ({ verification }) => {
  if (verification.valid) {
    return null;
  }

  return {
    ruleId: "R6",
    name: "CHAIN_BROKEN",
    points: 50,
    severity: "critical",
    explanation:
      "The history of this plot does not pass its integrity check; records may have been altered.",
    evidence: {
      firstBrokenSeq: verification.firstBrokenSeq,
      reason: verification.reason,
    },
  };
};
