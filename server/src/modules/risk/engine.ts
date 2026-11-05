import { RISK_CONFIG } from "./config.js";
import type { RiskBand, RiskContext, RiskReport, RiskRule } from "./types.js";
import { evaluateAreaMismatch } from "./rules/area-mismatch.js";
import { evaluateChainBroken } from "./rules/chain-broken.js";
import { evaluateDisputeFlag } from "./rules/dispute-flag.js";
import { evaluateDoubleSale } from "./rules/double-sale.js";
import { evaluateMutationMismatch } from "./rules/mutation-mismatch.js";
import { evaluateRapidTransfers } from "./rules/rapid-transfers.js";

const RULES: readonly RiskRule[] = [
  evaluateDoubleSale,
  evaluateMutationMismatch,
  evaluateRapidTransfers,
  evaluateAreaMismatch,
  evaluateDisputeFlag,
  evaluateChainBroken,
];

export function riskBand(score: number): RiskBand {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError("Risk score must be a finite number between 0 and 100.");
  }

  if (score < 25) return "LOW";
  if (score < 50) return "MEDIUM";
  if (score < 75) return "HIGH";
  return "CRITICAL";
}

export function runRiskEngine(
  context: RiskContext,
  config: Readonly<typeof RISK_CONFIG> = RISK_CONFIG,
): RiskReport {
  const findings = RULES.map((rule) => rule(context, config))
    .filter((finding) => finding !== null)
    .sort(
      (left, right) =>
        right.points - left.points || left.ruleId.localeCompare(right.ruleId),
    );
  const score = Math.min(
    100,
    findings.reduce((total, finding) => total + finding.points, 0),
  );

  return {
    score,
    band: riskBand(score),
    findings,
    ruleVersion: config.ruleVersion,
    generatedAt: context.currentDate.toISOString(),
  };
}
