import { describe, expect, it } from "vitest";
import { verifyChain } from "../src/modules/ledger/hash-chain.js";
import { RISK_CONFIG } from "../src/modules/risk/config.js";
import { runRiskEngine } from "../src/modules/risk/engine.js";
import { buildSeedFixtures, SEED_REFERENCE_DATE } from "../src/seed/fixtures.js";

describe("seed fixtures", () => {
  const fixtures = buildSeedFixtures(RISK_CONFIG.areaScale);

  it("creates 34 bounded parcels with non-overlapping bounds and valid chains", () => {
    expect(fixtures.parcels).toHaveLength(34);
    expect(new Set(fixtures.parcels.map(({ dagNumber }) => dagNumber)).size).toBe(34);
    expect(fixtures.owners).toHaveLength(20);
    expect(
      fixtures.parcels.reduce<Record<string, number>>((counts, parcel) => {
        counts[parcel.landType] = (counts[parcel.landType] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({
      AGRICULTURAL: 14,
      RESIDENTIAL: 10,
      COMMERCIAL: 4,
      WETLAND: 3,
      GOVERNMENT: 3,
    });

    for (const parcel of fixtures.parcels) {
      const entries = fixtures.ledgerEntries.filter(
        (entry) => entry.parcelId.toString() === parcel._id!.toString(),
      );
      expect(verifyChain(entries, parcel.currentOwnerId).valid).toBe(true);
    }
  });

  it("generates identical parcel and ledger fixtures for the same fixed seed", () => {
    expect(buildSeedFixtures(RISK_CONFIG.areaScale)).toEqual(fixtures);
  });

  it("keeps adjacent parcels close while leaving narrow road corridors", () => {
    const first = fixtures.parcels.find((parcel) => parcel.dagNumber === "1")!;
    const second = fixtures.parcels.find((parcel) => parcel.dagNumber === "2")!;
    const parcelBelow = fixtures.parcels.find((parcel) => parcel.dagNumber === "6")!;
    const rightEdge = (parcel: (typeof fixtures.parcels)[number]): number =>
      Math.max(...parcel.polygon.map(([x]) => x));
    const leftEdge = (parcel: (typeof fixtures.parcels)[number]): number =>
      Math.min(...parcel.polygon.map(([x]) => x));
    const bottomEdge = (parcel: (typeof fixtures.parcels)[number]): number =>
      Math.max(...parcel.polygon.map(([, y]) => y));
    const topEdge = (parcel: (typeof fixtures.parcels)[number]): number =>
      Math.min(...parcel.polygon.map(([, y]) => y));

    expect(leftEdge(second) - rightEdge(first)).toBeGreaterThan(0);
    expect(leftEdge(second) - rightEdge(first)).toBeLessThanOrEqual(30);
    expect(topEdge(parcelBelow) - bottomEdge(first)).toBeGreaterThan(0);
    expect(topEdge(parcelBelow) - bottomEdge(first)).toBeLessThanOrEqual(30);
  });

  it("matches the expected pre-tamper risk findings and scores", () => {
    const expected = new Map<number, { findings: string[]; score: number; band: string }>([
      [3, { findings: [], score: 0, band: "LOW" }],
      [7, { findings: ["R3"], score: 20, band: "LOW" }],
      [14, { findings: ["R1", "R2"], score: 70, band: "HIGH" }],
      [18, { findings: [], score: 0, band: "LOW" }],
      [21, { findings: ["R2"], score: 30, band: "MEDIUM" }],
      [29, { findings: ["R4"], score: 15, band: "LOW" }],
      [33, { findings: ["R5"], score: 25, band: "MEDIUM" }],
    ]);

    for (const [dag, result] of expected) {
      const parcel = fixtures.parcels.find((item) => item.dagNumber === String(dag))!;
      const ledgerEntries = fixtures.ledgerEntries.filter(
        (entry) => entry.parcelId.toString() === parcel._id!.toString(),
      );
      const ownerName = (id: { toString(): string }): string | null =>
        fixtures.owners.find((owner) => owner._id!.toString() === id.toString())?.name ?? null;
      const report = runRiskEngine(
        {
          parcel: {
            ...parcel,
            currentOwnerName: ownerName(parcel.currentOwnerId),
            khatianOwnerName: ownerName(parcel.khatianOwnerId),
          },
          ledgerEntries,
          verification: verifyChain(ledgerEntries, parcel.currentOwnerId),
          currentDate: SEED_REFERENCE_DATE,
        },
      );

      expect({
        findings: report.findings.map(({ ruleId }) => ruleId).sort(),
        score: report.score,
        band: report.band,
      }).toEqual({
        findings: [...result.findings].sort(),
        score: result.score,
        band: result.band,
      });
    }
  });
});
