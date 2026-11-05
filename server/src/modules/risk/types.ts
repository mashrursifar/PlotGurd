import type {
  ChainVerification,
  IdLike,
  LedgerEntry,
} from "../ledger/hash-chain.js";
import type { Point } from "../../utils/geometry.js";
import type { RiskConfig } from "./config.js";

export interface RiskParcel {
  currentOwnerId: IdLike;
  currentOwnerName?: string | null;
  khatianOwnerId: IdLike;
  khatianOwnerName?: string | null;
  recordedAreaDecimal: number;
  polygon: readonly Point[];
  disputeFlag: boolean;
  disputeReason: string | null;
}

export interface RiskContext {
  parcel: RiskParcel;
  ledgerEntries: readonly LedgerEntry[];
  verification: ChainVerification;
  currentDate: Date;
}

export type RiskRuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6";
export type RiskSeverity = "medium" | "high" | "critical";

export interface RiskFinding {
  ruleId: RiskRuleId;
  name: string;
  points: number;
  severity: RiskSeverity;
  explanation: string;
  evidence: Record<string, unknown>;
}

export type RiskRule = (
  context: RiskContext,
  config: Readonly<RiskConfig>,
) => RiskFinding | null;

export type RiskBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskReport {
  score: number;
  band: RiskBand;
  findings: RiskFinding[];
  ruleVersion: string;
  generatedAt: string;
}
