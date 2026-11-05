import { env } from "../../config/env.js";

export interface RiskConfig {
  mutationGraceDays: number;
  rapidWindowDays: number;
  rapidMinTransfers: number;
  areaTolerance: number;
  areaScale: number;
  ruleVersion: string;
}

export const RISK_CONFIG: Readonly<RiskConfig> = Object.freeze({
  mutationGraceDays: 90,
  rapidWindowDays: 365,
  rapidMinTransfers: 3,
  areaTolerance: 0.1,
  areaScale: env.AREA_SCALE,
  ruleVersion: "1.0",
});
