import type { RiskRule } from "../types.js";
import { changesOwnership, effectiveDateMs } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const evaluateRapidTransfers: RiskRule = (
  { ledgerEntries },
  config,
) => {
  const transfers = ledgerEntries
    .filter(changesOwnership)
    .map((entry) => ({ entry, timestamp: effectiveDateMs(entry) }))
    .sort(
      (left, right) =>
        left.timestamp - right.timestamp || left.entry.seq - right.entry.seq,
    );
  let startIndex = 0;

  for (let endIndex = 0; endIndex < transfers.length; endIndex += 1) {
    while (
      transfers[endIndex].timestamp - transfers[startIndex].timestamp >
      config.rapidWindowDays * DAY_MS
    ) {
      startIndex += 1;
    }

    if (endIndex - startIndex + 1 >= config.rapidMinTransfers) {
      const entries = transfers.slice(startIndex, endIndex + 1);
      const firstDate = new Date(entries[0].timestamp).toISOString();
      const lastDate = new Date(entries[entries.length - 1].timestamp).toISOString();

      return {
        ruleId: "R3",
        name: "RAPID_TRANSFERS",
        points: 20,
        severity: "medium",
        explanation: "This plot changed hands several times in a short period.",
        evidence: {
          entries: entries.map(({ entry }) => ({
            seq: entry.seq,
            type: entry.type,
            effectiveDate: new Date(entry.effectiveDate).toISOString(),
          })),
          windowStart: firstDate,
          windowEnd: lastDate,
          windowDays: config.rapidWindowDays,
        },
      };
    }
  }

  return null;
};
