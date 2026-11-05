import type { LedgerEntry, LedgerEntryType } from "../../ledger/hash-chain.js";

const OWNERSHIP_CHANGING_TYPES: ReadonlySet<LedgerEntryType> = new Set([
  "SALE",
  "INHERITANCE",
  "GIFT",
  "CORRECTION",
]);

export function changesOwnership(entry: LedgerEntry): boolean {
  return OWNERSHIP_CHANGING_TYPES.has(entry.type);
}

export function ownerLabel(name: string | null | undefined, id: string): string {
  return name ?? id;
}

export function effectiveDateMs(entry: LedgerEntry): number {
  const timestamp =
    entry.effectiveDate instanceof Date
      ? entry.effectiveDate.getTime()
      : new Date(entry.effectiveDate).getTime();

  if (!Number.isFinite(timestamp)) {
    throw new RangeError(`Ledger entry ${entry.seq} has an invalid effectiveDate.`);
  }

  return timestamp;
}
