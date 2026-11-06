import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeEntryHash } from "../src/modules/ledger/hash-chain.js";

const repositories = vi.hoisted(() => ({
  findOwnerNamesByIds: vi.fn(),
  findUserNamesByIds: vi.fn(),
  findParcelById: vi.fn(),
  listLedgerEntries: vi.fn(),
}));

vi.mock("../src/modules/owners/owner.repository.js", () => ({
  findOwnerNamesByIds: repositories.findOwnerNamesByIds,
}));
vi.mock("../src/modules/users/user.repository.js", () => ({
  findUserNamesByIds: repositories.findUserNamesByIds,
}));
vi.mock("../src/modules/parcels/parcel.repository.js", () => ({
  findParcelById: repositories.findParcelById,
}));
vi.mock("../src/modules/ledger/ledger-entry.repository.js", () => ({
  listLedgerEntries: repositories.listLedgerEntries,
}));

import { getParcelHistory, verifyParcelHistory } from "../src/modules/ledger/ledger.service.js";
import type { LedgerEntryRecord } from "../src/modules/ledger/ledger-entry.model.js";
import type { Parcel } from "../src/modules/parcels/parcel.model.js";

const parcelId = new Types.ObjectId("660000000000000000000014");
const ownerId = new Types.ObjectId("650000000000000000000114");
const userId = new Types.ObjectId("6500000000000000000000a3");
const parcel: Parcel = {
  _id: parcelId,
  mouza: "Kalpanapur",
  dagNumber: "14",
  khatianNumber: "K-014",
  landType: "RESIDENTIAL",
  recordedAreaDecimal: 100,
  polygon: [[0, 0], [20, 0], [20, 10]],
  currentOwnerId: ownerId,
  khatianOwnerId: ownerId,
  status: "ACTIVE",
  disputeFlag: false,
  disputeReason: null,
};
const entryWithoutHash: Omit<LedgerEntryRecord, "entryHash"> = {
  parcelId,
  seq: 1,
  type: "REGISTRATION",
  fromOwnerId: null,
  toOwnerId: ownerId,
  effectiveDate: new Date("2025-01-01T00:00:00.000Z"),
  performedBy: userId,
  source: "LIVE",
  note: null,
  prevHash: "GENESIS",
};
const entry: LedgerEntryRecord = {
  ...entryWithoutHash,
  entryHash: computeEntryHash(entryWithoutHash),
};

describe("ledger service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repositories.findParcelById.mockResolvedValue(parcel);
    repositories.listLedgerEntries.mockResolvedValue([entry]);
    repositories.findOwnerNamesByIds.mockResolvedValue([
      { _id: ownerId, name: "Fictional Parcel Owner" },
    ]);
    repositories.findUserNamesByIds.mockResolvedValue([
      { _id: userId, name: "Fictional Authority" },
    ]);
  });

  it("returns ordered history with names and without internal identifiers", async () => {
    const history = await getParcelHistory(parcelId.toString());

    expect(history).toEqual([
      {
        seq: 1,
        type: "REGISTRATION",
        fromOwner: null,
        toOwner: "Fictional Parcel Owner",
        effectiveDate: entry.effectiveDate,
        performedBy: "Fictional Authority",
        source: "LIVE",
        note: null,
      },
    ]);
    expect(repositories.findOwnerNamesByIds).toHaveBeenCalledWith([ownerId.toString()]);
    expect(repositories.findUserNamesByIds).toHaveBeenCalledWith([userId.toString()]);
  });

  it("reports a missing parcel for history and verification", async () => {
    repositories.findParcelById.mockResolvedValue(null);

    await expect(getParcelHistory(parcelId.toString())).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
    await expect(verifyParcelHistory(parcelId.toString())).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
    expect(repositories.listLedgerEntries).not.toHaveBeenCalled();
  });

  it("checks the chain against the parcel's current owner", async () => {
    await expect(verifyParcelHistory(parcelId.toString())).resolves.toMatchObject({
      valid: true,
      entriesChecked: 1,
      firstBrokenSeq: null,
    });
    expect(repositories.listLedgerEntries).toHaveBeenCalledWith(parcelId.toString());
  });

  it("surfaces missing related records instead of returning incomplete history", async () => {
    repositories.findOwnerNamesByIds.mockResolvedValue([]);

    await expect(getParcelHistory(parcelId.toString())).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500,
    });
  });
});
