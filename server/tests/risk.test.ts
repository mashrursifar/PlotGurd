import { describe, expect, it } from "vitest";
import {
  computeEntryHash,
  type LedgerEntry,
  type LedgerEntryHashInput,
  type LedgerEntryType,
} from "../src/modules/ledger/hash-chain.js";
import { RISK_CONFIG } from "../src/modules/risk/config.js";
import { riskBand, runRiskEngine } from "../src/modules/risk/engine.js";
import { evaluateAreaMismatch } from "../src/modules/risk/rules/area-mismatch.js";
import { evaluateChainBroken } from "../src/modules/risk/rules/chain-broken.js";
import { evaluateDisputeFlag } from "../src/modules/risk/rules/dispute-flag.js";
import { evaluateDoubleSale } from "../src/modules/risk/rules/double-sale.js";
import { evaluateMutationMismatch } from "../src/modules/risk/rules/mutation-mismatch.js";
import { evaluateRapidTransfers } from "../src/modules/risk/rules/rapid-transfers.js";
import type { RiskContext } from "../src/modules/risk/types.js";
import type { Point } from "../src/utils/geometry.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const CONFIG = { ...RISK_CONFIG, areaScale: 1 };

interface EntryRecord {
  type: LedgerEntryType;
  fromOwnerId: string | null;
  toOwnerId: string;
  effectiveDate: string;
}

function makeEntries(records: readonly EntryRecord[]): LedgerEntry[] {
  let previousHash = "GENESIS";

  return records.map((record, index) => {
    const hashInput: LedgerEntryHashInput = {
      parcelId: "parcel-1",
      seq: index + 1,
      ...record,
      performedBy: "authority-1",
      source: "LEGACY_IMPORT",
      note: null,
      prevHash: previousHash,
    };
    const entry = { ...hashInput, entryHash: computeEntryHash(hashInput) };
    previousHash = entry.entryHash;
    return entry;
  });
}

function registration(ownerId = "owner-1"): EntryRecord {
  return {
    type: "REGISTRATION",
    fromOwnerId: null,
    toOwnerId: ownerId,
    effectiveDate: "2025-12-31T00:00:00.000Z",
  };
}

function context(
  ledgerEntries: readonly LedgerEntry[] = makeEntries([registration()]),
  overrides: Partial<RiskContext["parcel"]> = {},
  verification: RiskContext["verification"] = {
    valid: true,
    entriesChecked: ledgerEntries.length,
    firstBrokenSeq: null,
    reason: null,
  },
): RiskContext {
  return {
    parcel: {
      currentOwnerId: "owner-1",
      khatianOwnerId: "owner-1",
      recordedAreaDecimal: 100,
      polygon: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      disputeFlag: false,
      disputeReason: null,
      ...overrides,
    },
    ledgerEntries,
    verification,
    currentDate: NOW,
  };
}

function transfer(
  type: LedgerEntryType,
  fromOwnerId: string,
  toOwnerId: string,
  effectiveDate: string,
): EntryRecord {
  return { type, fromOwnerId, toOwnerId, effectiveDate };
}

describe("R1 DOUBLE_SALE", () => {
  it("triggers for two sales by the same seller without a return", () => {
    const entries = makeEntries([
      registration(),
      transfer("SALE", "owner-1", "owner-2", "2025-01-01T00:00:00.000Z"),
      transfer("SALE", "owner-1", "owner-3", "2025-02-01T00:00:00.000Z"),
    ]);

    expect(evaluateDoubleSale(context(entries), CONFIG)).toMatchObject({
      ruleId: "R1",
      name: "DOUBLE_SALE",
      points: 40,
      evidence: {
        sellerId: "owner-1",
        entries: [{ seq: 2 }, { seq: 3 }],
      },
    });
  });

  it("does not trigger after ownership returns to the seller", () => {
    const entries = makeEntries([
      registration(),
      transfer("SALE", "owner-1", "owner-2", "2025-01-01T00:00:00.000Z"),
      transfer("SALE", "owner-2", "owner-1", "2025-02-01T00:00:00.000Z"),
      transfer("SALE", "owner-1", "owner-3", "2025-03-01T00:00:00.000Z"),
    ]);

    expect(evaluateDoubleSale(context(entries), CONFIG)).toBeNull();
  });
});

describe("R2 MUTATION_MISMATCH", () => {
  it("triggers when current and khatian owners differ", () => {
    const result = evaluateMutationMismatch(
      context(undefined, {
        currentOwnerId: "owner-2",
        currentOwnerName: "Fictional Owner Two",
        khatianOwnerId: "owner-1",
        khatianOwnerName: "Fictional Owner One",
      }),
      CONFIG,
    );

    expect(result).toMatchObject({
      ruleId: "R2",
      evidence: {
        checks: [
          {
            check: "OWNER_MISMATCH",
            currentOwner: "Fictional Owner Two",
            khatianOwner: "Fictional Owner One",
          },
        ],
      },
    });
  });

  it.each([89, 90])("does not flag a transfer %i days old", (daysOld) => {
    const date = new Date(NOW.getTime() - daysOld * 24 * 60 * 60 * 1000);
    const entries = makeEntries([
      registration(),
      transfer("SALE", "owner-1", "owner-2", date.toISOString()),
    ]);

    expect(
      evaluateMutationMismatch(
        context(entries, {
          currentOwnerId: "owner-2",
          khatianOwnerId: "owner-2",
        }),
        CONFIG,
      ),
    ).toBeNull();
  });

  it("flags a transfer 91 days old without a following mutation", () => {
    const date = new Date(NOW.getTime() - 91 * 24 * 60 * 60 * 1000);
    const entries = makeEntries([
      registration(),
      transfer("SALE", "owner-1", "owner-2", date.toISOString()),
    ]);

    expect(
      evaluateMutationMismatch(
        context(entries, {
          currentOwnerId: "owner-2",
          khatianOwnerId: "owner-2",
        }),
        CONFIG,
      ),
    ).toMatchObject({
      ruleId: "R2",
      evidence: {
        checks: [{ check: "MUTATION_OVERDUE", daysElapsed: 91 }],
      },
    });
  });

  it("does not flag an old transfer followed by a mutation", () => {
    const transferDate = new Date(
      NOW.getTime() - 91 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const entries = makeEntries([
      registration(),
      transfer("SALE", "owner-1", "owner-2", transferDate),
      transfer("MUTATION", "owner-2", "owner-2", NOW.toISOString()),
    ]);

    expect(
      evaluateMutationMismatch(
        context(entries, {
          currentOwnerId: "owner-2",
          khatianOwnerId: "owner-2",
        }),
        CONFIG,
      ),
    ).toBeNull();
  });
});

describe("R3 RAPID_TRANSFERS", () => {
  const rapidTransfers = [
    transfer("SALE", "owner-1", "owner-2", "2025-01-01T00:00:00.000Z"),
    transfer("GIFT", "owner-2", "owner-3", "2025-06-01T00:00:00.000Z"),
    transfer("INHERITANCE", "owner-3", "owner-4", "2025-12-01T00:00:00.000Z"),
  ];

  it("triggers for three transfers in a rolling 365-day window", () => {
    const entries = makeEntries([registration(), ...rapidTransfers]);

    expect(evaluateRapidTransfers(context(entries), CONFIG)).toMatchObject({
      ruleId: "R3",
      points: 20,
      evidence: { entries: [{ seq: 2 }, { seq: 3 }, { seq: 4 }] },
    });
  });

  it("does not trigger for only two transfers", () => {
    const entries = makeEntries([registration(), ...rapidTransfers.slice(0, 2)]);

    expect(evaluateRapidTransfers(context(entries), CONFIG)).toBeNull();
  });

  it("does not trigger when three transfers span more than 365 days", () => {
    const entries = makeEntries([
      registration(),
      transfer("SALE", "owner-1", "owner-2", "2024-01-01T00:00:00.000Z"),
      transfer("GIFT", "owner-2", "owner-3", "2024-06-01T00:00:00.000Z"),
      transfer("INHERITANCE", "owner-3", "owner-4", "2025-02-05T00:00:00.000Z"),
    ]);

    expect(evaluateRapidTransfers(context(entries), CONFIG)).toBeNull();
  });

  it("includes transfers exactly 365 days apart", () => {
    const entries = makeEntries([
      registration(),
      transfer("SALE", "owner-1", "owner-2", "2025-01-01T00:00:00.000Z"),
      transfer("GIFT", "owner-2", "owner-3", "2025-07-01T00:00:00.000Z"),
      transfer("CORRECTION", "owner-3", "owner-4", "2026-01-01T00:00:00.000Z"),
    ]);

    expect(evaluateRapidTransfers(context(entries), CONFIG)).not.toBeNull();
  });
});

describe("R4 AREA_MISMATCH", () => {
  function parcelWithArea(area: number): Partial<RiskContext["parcel"]> {
    const polygon: readonly Point[] = [
      [0, 0],
      [area, 0],
      [area, 1],
      [0, 1],
    ];
    return { polygon };
  }

  it("does not trigger at exactly ten percent difference", () => {
    expect(
      evaluateAreaMismatch(
        context(undefined, {
          ...parcelWithArea(90),
          recordedAreaDecimal: 100,
        }),
        CONFIG,
      ),
    ).toBeNull();
  });

  it("triggers above ten percent difference", () => {
    expect(
      evaluateAreaMismatch(
        context(undefined, {
          ...parcelWithArea(89),
          recordedAreaDecimal: 100,
        }),
        CONFIG,
      ),
    ).toMatchObject({
      ruleId: "R4",
      evidence: { recordedAreaDecimal: 100, computedAreaDecimal: 89 },
    });
  });
});

describe("R5 DISPUTE_FLAG", () => {
  it("triggers when the parcel is disputed", () => {
    expect(
      evaluateDisputeFlag(
        context(undefined, {
          disputeFlag: true,
          disputeReason: "Fictional boundary concern",
        }),
        CONFIG,
      ),
    ).toMatchObject({
      ruleId: "R5",
      points: 25,
      evidence: { disputeReason: "Fictional boundary concern" },
    });
  });

  it("does not trigger when the parcel is not disputed", () => {
    expect(evaluateDisputeFlag(context(), CONFIG)).toBeNull();
  });
});

describe("R6 CHAIN_BROKEN", () => {
  it("triggers when verification fails", () => {
    expect(
      evaluateChainBroken(
        context(undefined, {}, {
          valid: false,
          entriesChecked: 1,
          firstBrokenSeq: 2,
          reason: "Hash mismatch",
        }),
        CONFIG,
      ),
    ).toMatchObject({
      ruleId: "R6",
      points: 50,
      severity: "critical",
      evidence: { firstBrokenSeq: 2, reason: "Hash mismatch" },
    });
  });

  it("does not trigger when verification succeeds", () => {
    expect(evaluateChainBroken(context(), CONFIG)).toBeNull();
  });
});

describe("risk engine and bands", () => {
  it.each([
    [24, "LOW"],
    [25, "MEDIUM"],
    [49, "MEDIUM"],
    [50, "HIGH"],
    [74, "HIGH"],
    [75, "CRITICAL"],
  ] as const)("maps score %i to %s", (score, band) => {
    expect(riskBand(score)).toBe(band);
  });

  it("sums findings, caps the score at 100, and sorts by points", () => {
    const entries = makeEntries([
      registration(),
      transfer("SALE", "owner-1", "owner-2", "2025-01-01T00:00:00.000Z"),
      transfer("SALE", "owner-1", "owner-3", "2025-02-01T00:00:00.000Z"),
      transfer("GIFT", "owner-3", "owner-4", "2025-03-01T00:00:00.000Z"),
    ]);
    const report = runRiskEngine(
      context(
        entries,
        {
          currentOwnerId: "owner-4",
          khatianOwnerId: "owner-2",
          recordedAreaDecimal: 200,
          disputeFlag: true,
          disputeReason: "Fictional dispute",
        },
        {
          valid: false,
          entriesChecked: 3,
          firstBrokenSeq: 2,
          reason: "Tampered entry",
        },
      ),
      CONFIG,
    );

    expect(report.score).toBe(100);
    expect(report.band).toBe("CRITICAL");
    expect(report.findings.map(({ points }) => points)).toEqual([
      50, 40, 30, 25, 20, 15,
    ]);
    expect(report.ruleVersion).toBe("1.0");
    expect(report.generatedAt).toBe(NOW.toISOString());
  });

  it("returns zero and LOW for a clean parcel", () => {
    const report = runRiskEngine(context(), CONFIG);

    expect(report).toMatchObject({
      score: 0,
      band: "LOW",
      findings: [],
    });
  });
});
