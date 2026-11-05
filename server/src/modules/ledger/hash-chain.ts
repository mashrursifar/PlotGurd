import { createHash } from "node:crypto";

export type LedgerEntryType =
  | "REGISTRATION"
  | "SALE"
  | "INHERITANCE"
  | "GIFT"
  | "MUTATION"
  | "CORRECTION";

export type LedgerEntrySource = "LIVE" | "LEGACY_IMPORT";

export type IdLike = string | { toString(): string };

export interface LedgerEntryHashInput {
  parcelId: IdLike;
  seq: number;
  type: LedgerEntryType;
  fromOwnerId: IdLike | null;
  toOwnerId: IdLike;
  effectiveDate: Date | string;
  performedBy: IdLike;
  source: LedgerEntrySource;
  note?: string | null;
  prevHash: string;
}

export interface LedgerEntry extends LedgerEntryHashInput {
  entryHash: string;
}

export interface ChainVerification {
  valid: boolean;
  entriesChecked: number;
  firstBrokenSeq: number | null;
  reason: string | null;
}

function normalizeDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("Ledger entry effectiveDate must be a valid date.");
  }

  return date.toISOString();
}

export function computeEntryHash(entry: LedgerEntryHashInput): string {
  const fields: Record<string, string | number | null> = {
    parcelId: entry.parcelId.toString(),
    seq: entry.seq,
    type: entry.type,
    fromOwnerId: entry.fromOwnerId?.toString() ?? null,
    toOwnerId: entry.toOwnerId.toString(),
    effectiveDate: normalizeDate(entry.effectiveDate),
    performedBy: entry.performedBy.toString(),
    source: entry.source,
    note: entry.note ?? null,
    prevHash: entry.prevHash,
  };
  const canonicalJson = JSON.stringify(
    Object.fromEntries(
      Object.entries(fields).sort(([left], [right]) =>
        left < right ? -1 : left > right ? 1 : 0,
      ),
    ),
  );

  return createHash("sha256").update(canonicalJson).digest("hex");
}

function result(
  valid: boolean,
  entriesChecked: number,
  firstBrokenSeq: number | null,
  reason: string | null,
): ChainVerification {
  return { valid, entriesChecked, firstBrokenSeq, reason };
}

export function verifyChain(
  entries: readonly LedgerEntry[],
  currentOwnerId: IdLike,
): ChainVerification {
  if (entries.length === 0) {
    return result(false, 0, 1, "The ledger chain is empty.");
  }

  let previousHash = "GENESIS";

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const expectedSeq = index + 1;

    if (entry.seq !== expectedSeq) {
      return result(
        false,
        index,
        expectedSeq,
        `Expected sequence ${expectedSeq}, found ${entry.seq}.`,
      );
    }

    if (entry.prevHash !== previousHash) {
      return result(
        false,
        index,
        expectedSeq,
        `Previous hash does not match at sequence ${expectedSeq}.`,
      );
    }

    const effectiveDate =
      entry.effectiveDate instanceof Date
        ? entry.effectiveDate
        : new Date(entry.effectiveDate);

    if (!Number.isFinite(effectiveDate.getTime())) {
      return result(
        false,
        index,
        expectedSeq,
        `Invalid effective date at sequence ${expectedSeq}.`,
      );
    }

    if (computeEntryHash(entry) !== entry.entryHash) {
      return result(false, index, expectedSeq, `Hash mismatch at sequence ${expectedSeq}.`);
    }

    previousHash = entry.entryHash;
  }

  const lastEntry = entries[entries.length - 1];

  if (lastEntry.toOwnerId.toString() !== currentOwnerId.toString()) {
    return result(
      false,
      entries.length,
      lastEntry.seq,
      "The final ledger owner does not match the parcel's current owner.",
    );
  }

  return result(true, entries.length, null, null);
}
