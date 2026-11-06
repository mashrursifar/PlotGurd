import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositories = vi.hoisted(() => ({
  findOwnersByIds: vi.fn(),
  findParcelById: vi.fn(),
  findParcelsByIds: vi.fn(),
  listLedgerEntries: vi.fn(),
  insertRiskAssessments: vi.fn(),
  findLatestAssessment: vi.fn(),
  listAssessmentsForUser: vi.fn(),
  listRiskAssessmentPage: vi.fn(),
}));

vi.mock("../src/modules/owners/owner.repository.js", () => ({
  findOwnersByIds: repositories.findOwnersByIds,
}));
vi.mock("../src/modules/parcels/parcel.repository.js", () => ({
  findParcelById: repositories.findParcelById,
  findParcelsByIds: repositories.findParcelsByIds,
}));
vi.mock("../src/modules/ledger/ledger-entry.repository.js", () => ({
  listLedgerEntries: repositories.listLedgerEntries,
}));
vi.mock("../src/modules/risk/risk-assessment.repository.js", () => ({
  findLatestAssessment: repositories.findLatestAssessment,
  insertRiskAssessments: repositories.insertRiskAssessments,
  listAssessmentsForUser: repositories.listAssessmentsForUser,
  listRiskAssessmentPage: repositories.listRiskAssessmentPage,
}));

import { env } from "../src/config/env.js";
import { computeEntryHash } from "../src/modules/ledger/hash-chain.js";
import type { LedgerEntryRecord } from "../src/modules/ledger/ledger-entry.model.js";
import type { Owner } from "../src/modules/owners/owner.model.js";
import type { Parcel } from "../src/modules/parcels/parcel.model.js";
import {
  assessParcelRisk,
  getAllRiskAssessments,
  getLatestParcelRiskAssessment,
  getUserRiskAssessments,
} from "../src/modules/risk/risk.service.js";

const parcelId = new Types.ObjectId("660000000000000000000014");
const ownerId = new Types.ObjectId("650000000000000000000114");
const userId = "6500000000000000000000a3";
const parcel: Parcel = {
  _id: parcelId,
  mouza: "Kalpanapur",
  dagNumber: "14",
  khatianNumber: "K-014",
  landType: "RESIDENTIAL",
  recordedAreaDecimal: 100 * env.AREA_SCALE,
  polygon: [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ],
  currentOwnerId: ownerId,
  khatianOwnerId: ownerId,
  status: "ACTIVE",
  disputeFlag: false,
  disputeReason: null,
};
const owner: Owner = {
  _id: ownerId,
  name: "Fictional Parcel Owner",
  nationalId: "test-owner-14",
  address: "Fictional address",
};
const entryInput = {
  parcelId,
  seq: 1,
  type: "REGISTRATION" as const,
  fromOwnerId: null,
  toOwnerId: ownerId,
  effectiveDate: new Date("2025-01-01T00:00:00.000Z"),
  performedBy: new Types.ObjectId("650000000000000000000001"),
  source: "LIVE" as const,
  note: null,
  prevHash: "GENESIS",
};
const ledgerEntry: LedgerEntryRecord = {
  ...entryInput,
  entryHash: computeEntryHash(entryInput),
};
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const storedAssessment = {
  _id: new Types.ObjectId("670000000000000000000014"),
  parcelId,
  userId: new Types.ObjectId(userId),
  score: 0,
  band: "LOW" as const,
  findings: [],
  ruleVersion: "1.0",
  createdAt,
};

describe("risk assessment service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repositories.findParcelById.mockResolvedValue(parcel);
    repositories.listLedgerEntries.mockResolvedValue([ledgerEntry]);
    repositories.findOwnersByIds.mockResolvedValue([owner]);
    repositories.insertRiskAssessments.mockResolvedValue([storedAssessment]);
    repositories.findLatestAssessment.mockResolvedValue(storedAssessment);
    repositories.listAssessmentsForUser.mockResolvedValue([storedAssessment]);
    repositories.listRiskAssessmentPage.mockResolvedValue({
      assessments: [storedAssessment],
      total: 1,
    });
    repositories.findParcelsByIds.mockResolvedValue([parcel]);
  });

  it("runs the engine against parcel and ledger data and stores the report", async () => {
    const report = await assessParcelRisk(parcelId.toString(), userId);

    expect(report).toMatchObject({
      score: 0,
      band: "LOW",
      findings: [],
      ruleVersion: "1.0",
    });
    expect(Number.isFinite(Date.parse(report.generatedAt))).toBe(true);
    expect(repositories.listLedgerEntries).toHaveBeenCalledWith(
      parcelId.toString(),
    );
    expect(repositories.insertRiskAssessments).toHaveBeenCalledWith([
      expect.objectContaining({
        parcelId,
        userId: new Types.ObjectId(userId),
        score: report.score,
        band: report.band,
        findings: report.findings,
        ruleVersion: report.ruleVersion,
      }),
    ]);
  });

  it("returns the latest assessment only for the requested user and parcel", async () => {
    await expect(
      getLatestParcelRiskAssessment(parcelId.toString(), userId),
    ).resolves.toEqual({
      score: 0,
      band: "LOW",
      findings: [],
      ruleVersion: "1.0",
      generatedAt: createdAt.toISOString(),
    });
    expect(repositories.findLatestAssessment).toHaveBeenCalledWith(
      parcelId.toString(),
      userId,
    );
  });

  it("adds parcel dag numbers to the current user's assessments", async () => {
    await expect(getUserRiskAssessments(userId)).resolves.toMatchObject([
      {
        id: storedAssessment._id.toString(),
        parcelId: parcelId.toString(),
        dagNumber: "14",
        score: 0,
        generatedAt: createdAt.toISOString(),
      },
    ]);
    expect(repositories.listAssessmentsForUser).toHaveBeenCalledWith(userId);
    expect(repositories.findParcelsByIds).toHaveBeenCalledWith([
      parcelId.toString(),
    ]);
  });

  it("passes authority paging and band filters to the repository", async () => {
    await expect(getAllRiskAssessments(2, 5, "HIGH")).resolves.toMatchObject({
      page: 2,
      limit: 5,
      total: 1,
      items: [{ dagNumber: "14" }],
    });
    expect(repositories.listRiskAssessmentPage).toHaveBeenCalledWith(
      2,
      5,
      "HIGH",
    );
  });

  it("returns not found when a parcel does not exist", async () => {
    repositories.findParcelById.mockResolvedValue(null);

    await expect(
      assessParcelRisk(parcelId.toString(), userId),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(repositories.insertRiskAssessments).not.toHaveBeenCalled();
  });
});
