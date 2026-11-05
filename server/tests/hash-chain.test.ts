import { describe, expect, it } from "vitest";
import {
  computeEntryHash,
  verifyChain,
  type LedgerEntry,
  type LedgerEntryHashInput,
} from "../src/modules/ledger/hash-chain.js";

const baseEntry: LedgerEntryHashInput = {
  parcelId: "parcel-1",
  seq: 1,
  type: "REGISTRATION",
  fromOwnerId: null,
  toOwnerId: "owner-1",
  effectiveDate: "2025-01-01T00:00:00.000Z",
  performedBy: "authority-1",
  source: "LIVE",
  note: null,
  prevHash: "GENESIS",
};

function createChain(
  records: Array<
    Partial<Omit<LedgerEntryHashInput, "seq" | "prevHash">> & {
      seq?: number;
      prevHash?: string;
    }>,
): LedgerEntry[] {
  let previousHash = "GENESIS";

  return records.map((record, index) => {
    const hashInput: LedgerEntryHashInput = {
      ...baseEntry,
      ...record,
      seq: record.seq ?? index + 1,
      prevHash: record.prevHash ?? previousHash,
    };
    const entry = { ...hashInput, entryHash: computeEntryHash(hashInput) };
    previousHash = entry.entryHash;
    return entry;
  });
}

describe("computeEntryHash", () => {
  it("hashes the same entry identically regardless of key order", () => {
    const reversedKeys = Object.fromEntries(
      Object.entries(baseEntry).reverse(),
    ) as LedgerEntryHashInput;

    expect(computeEntryHash(baseEntry)).toBe(computeEntryHash(reversedKeys));
  });

  it("changes when any hashed field changes", () => {
    const changes: LedgerEntryHashInput[] = [
      { ...baseEntry, parcelId: "parcel-2" },
      { ...baseEntry, seq: 2 },
      { ...baseEntry, type: "GIFT" },
      { ...baseEntry, fromOwnerId: "owner-2" },
      { ...baseEntry, toOwnerId: "owner-2" },
      { ...baseEntry, effectiveDate: "2025-01-02T00:00:00.000Z" },
      { ...baseEntry, performedBy: "authority-2" },
      { ...baseEntry, source: "LEGACY_IMPORT" },
      { ...baseEntry, note: "updated note" },
      { ...baseEntry, prevHash: "different-hash" },
    ];
    const originalHash = computeEntryHash(baseEntry);

    for (const changedEntry of changes) {
      expect(computeEntryHash(changedEntry)).not.toBe(originalHash);
    }
  });
});

describe("verifyChain", () => {
  const chain = createChain([
    {},
    {
      type: "SALE",
      fromOwnerId: "owner-1",
      toOwnerId: "owner-2",
      effectiveDate: "2025-02-01T00:00:00.000Z",
    },
  ]);

  it("accepts a valid chain", () => {
    expect(verifyChain(chain, "owner-2")).toEqual({
      valid: true,
      entriesChecked: 2,
      firstBrokenSeq: null,
      reason: null,
    });
  });

  it("reports the sequence of a tampered note", () => {
    const tampered = [...chain];
    tampered[1] = { ...tampered[1], note: "altered" };

    expect(verifyChain(tampered, "owner-2")).toMatchObject({
      valid: false,
      firstBrokenSeq: 2,
    });
  });

  it("rejects reordered entries at the first expected sequence", () => {
    expect(verifyChain([...chain].reverse(), "owner-2")).toMatchObject({
      valid: false,
      firstBrokenSeq: 1,
    });
  });

  it("rejects a deleted entry at the missing sequence", () => {
    const longerChain = createChain([
      {},
      {
        type: "SALE",
        fromOwnerId: "owner-1",
        toOwnerId: "owner-2",
      },
      {
        type: "GIFT",
        fromOwnerId: "owner-2",
        toOwnerId: "owner-3",
      },
    ]);

    expect(verifyChain([longerChain[0], longerChain[2]], "owner-3")).toMatchObject({
      valid: false,
      firstBrokenSeq: 2,
    });
  });

  it("rejects a wrong previous hash at that entry", () => {
    const wrongPreviousHash = [...chain];
    wrongPreviousHash[1] = {
      ...wrongPreviousHash[1],
      prevHash: "incorrect-link",
    };

    expect(verifyChain(wrongPreviousHash, "owner-2")).toMatchObject({
      valid: false,
      firstBrokenSeq: 2,
    });
  });

  it("rejects a final owner mismatch", () => {
    expect(verifyChain(chain, "owner-3")).toMatchObject({
      valid: false,
      firstBrokenSeq: 2,
      reason: expect.stringContaining("current owner"),
    });
  });
});
