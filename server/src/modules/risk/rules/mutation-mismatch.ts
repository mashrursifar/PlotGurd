import type { RiskRule } from "../types.js";
import { changesOwnership, effectiveDateMs, ownerLabel } from "./helpers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const evaluateMutationMismatch: RiskRule = (
  { parcel, ledgerEntries, currentDate },
  config,
) => {
  const checks: Record<string, unknown>[] = [];
  const currentOwnerId = parcel.currentOwnerId.toString();
  const khatianOwnerId = parcel.khatianOwnerId.toString();

  if (currentOwnerId !== khatianOwnerId) {
    checks.push({
      check: "OWNER_MISMATCH",
      currentOwner: ownerLabel(parcel.currentOwnerName, currentOwnerId),
      khatianOwner: ownerLabel(parcel.khatianOwnerName, khatianOwnerId),
    });
  }

  const latestOwnershipChange = [...ledgerEntries]
    .reverse()
    .find(changesOwnership);

  if (latestOwnershipChange) {
    const hasLaterMutation = ledgerEntries.some(
      (entry) =>
        entry.type === "MUTATION" && entry.seq > latestOwnershipChange.seq,
    );
    const daysElapsed = Math.floor(
      (currentDate.getTime() - effectiveDateMs(latestOwnershipChange)) / DAY_MS,
    );

    if (!hasLaterMutation && daysElapsed > config.mutationGraceDays) {
      checks.push({
        check: "MUTATION_OVERDUE",
        latestEntrySeq: latestOwnershipChange.seq,
        latestTransferDate: new Date(
          effectiveDateMs(latestOwnershipChange),
        ).toISOString(),
        daysElapsed,
        mutationGraceDays: config.mutationGraceDays,
      });
    }
  }

  if (checks.length === 0) {
    return null;
  }

  return {
    ruleId: "R2",
    name: "MUTATION_MISMATCH",
    points: 30,
    severity: "high",
    explanation: "The ownership record has not been updated to match the latest transfer.",
    evidence: { checks },
  };
};
