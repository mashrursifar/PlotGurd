import { Types, type ClientSession } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeEntryHash, verifyChain } from "../src/modules/ledger/hash-chain.js";

const repositories = vi.hoisted(() => ({
  withDatabaseTransaction: vi.fn(),
  findOwnerById: vi.fn(),
  findOwnerNamesByIds: vi.fn(),
  findUserNamesByIds: vi.fn(),
  findParcelById: vi.fn(),
  findParcelByIdInSession: vi.fn(),
  insertParcel: vi.fn(),
  updateParcelOwners: vi.fn(),
  insertLedgerEntries: vi.fn(),
  listLedgerEntries: vi.fn(),
  recordAuditLog: vi.fn(),
}));

vi.mock("../src/config/database.js", () => ({
  withDatabaseTransaction: repositories.withDatabaseTransaction,
}));
vi.mock("../src/modules/owners/owner.repository.js", () => ({
  findOwnerById: repositories.findOwnerById,
  findOwnerNamesByIds: repositories.findOwnerNamesByIds,
}));
vi.mock("../src/modules/users/user.repository.js", () => ({
  findUserNamesByIds: repositories.findUserNamesByIds,
}));
vi.mock("../src/modules/parcels/parcel.repository.js", () => ({
  findParcelById: repositories.findParcelById,
  findParcelByIdInSession: repositories.findParcelByIdInSession,
  insertParcel: repositories.insertParcel,
  updateParcelOwners: repositories.updateParcelOwners,
}));
vi.mock("../src/modules/ledger/ledger-entry.repository.js", () => ({
  insertLedgerEntries: repositories.insertLedgerEntries,
  listLedgerEntries: repositories.listLedgerEntries,
}));
vi.mock("../src/modules/audit/audit-log.service.js", () => ({
  recordAuditLog: repositories.recordAuditLog,
}));

import {
  recordParcelTransaction,
  registerParcel,
} from "../src/modules/ledger/ledger.service.js";
import type { LedgerEntryRecord } from "../src/modules/ledger/ledger-entry.model.js";
import type { Parcel } from "../src/modules/parcels/parcel.model.js";

const parcelId = new Types.ObjectId("660000000000000000000014");
const currentOwnerId = new Types.ObjectId("650000000000000000000114");
const newOwnerId = new Types.ObjectId("650000000000000000000115");
const authorityId = new Types.ObjectId("6500000000000000000000a1");
const parcel: Parcel = {
  _id: parcelId,
  mouza: "Kalpanapur",
  dagNumber: "14",
  khatianNumber: "K-014",
  landType: "RESIDENTIAL",
  recordedAreaDecimal: 100,
  polygon: [[0, 0], [20, 0], [20, 10]],
  currentOwnerId,
  khatianOwnerId: currentOwnerId,
  status: "ACTIVE",
  disputeFlag: false,
  disputeReason: null,
};
const registrationWithoutHash: Omit<LedgerEntryRecord, "entryHash"> = {
  parcelId,
  seq: 1,
  type: "REGISTRATION",
  fromOwnerId: null,
  toOwnerId: currentOwnerId,
  effectiveDate: new Date("2025-01-01T00:00:00.000Z"),
  performedBy: authorityId,
  source: "LIVE",
  note: null,
  prevHash: "GENESIS",
};
const registration: LedgerEntryRecord = {
  ...registrationWithoutHash,
  entryHash: computeEntryHash(registrationWithoutHash),
};

describe("recordParcelTransaction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repositories.withDatabaseTransaction.mockImplementation(
      async (operation: (session: ClientSession) => Promise<unknown>) =>
        operation({} as ClientSession),
    );
    repositories.findParcelByIdInSession.mockResolvedValue(parcel);
    repositories.findParcelById.mockResolvedValue(parcel);
    repositories.updateParcelOwners.mockResolvedValue(parcel);
    repositories.listLedgerEntries.mockResolvedValue([registration]);
    repositories.findOwnerById.mockResolvedValue({
      _id: newOwnerId,
      name: "Fictional New Owner",
      nationalId: "TEST-115",
      address: "Fictional address",
    });
    repositories.findOwnerNamesByIds.mockResolvedValue([
      { _id: currentOwnerId, name: "Fictional Current Owner" },
      { _id: newOwnerId, name: "Fictional New Owner" },
    ]);
    repositories.findUserNamesByIds.mockResolvedValue([
      { _id: authorityId, name: "Fictional Authority" },
    ]);
    repositories.insertLedgerEntries.mockImplementation(
      async (entries: LedgerEntryRecord[]) => entries,
    );
  });

  it("rejects a from-owner that does not match the current owner", async () => {
    await expect(
      recordParcelTransaction(parcelId.toString(), authorityId.toString(), {
        type: "SALE",
        fromOwnerId: newOwnerId.toString(),
        toOwnerId: currentOwnerId.toString(),
        effectiveDate: "2025-02-01T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });

    expect(repositories.insertLedgerEntries).not.toHaveBeenCalled();
    expect(repositories.updateParcelOwners).not.toHaveBeenCalled();
    expect(repositories.recordAuditLog).not.toHaveBeenCalled();
  });

  it("appends a sale, updates the owner, audits it, and preserves chain validity", async () => {
    let appended: LedgerEntryRecord[] = [];
    repositories.insertLedgerEntries.mockImplementation(
      async (entries: LedgerEntryRecord[]) => {
        appended = entries;
        return entries;
      },
    );

    const result = await recordParcelTransaction(
      parcelId.toString(),
      authorityId.toString(),
      {
        type: "SALE",
        fromOwnerId: currentOwnerId.toString(),
        toOwnerId: newOwnerId.toString(),
        effectiveDate: "2025-02-01T00:00:00.000Z",
        note: "Fictional sale record.",
      },
    );

    expect(result).toMatchObject({
      seq: 2,
      type: "SALE",
      fromOwner: "Fictional Current Owner",
      toOwner: "Fictional New Owner",
      performedBy: "Fictional Authority",
      source: "LIVE",
    });
    expect(repositories.updateParcelOwners).toHaveBeenCalledWith(
      parcelId.toString(),
      { currentOwnerId: newOwnerId },
      expect.anything(),
    );
    expect(repositories.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LEDGER_APPEND",
        targetType: "parcel",
      }),
      expect.anything(),
    );
    expect(
      verifyChain([registration, ...appended], newOwnerId),
    ).toMatchObject({ valid: true, entriesChecked: 2 });
  });

  it("registers a parcel with its first chained ledger entry and audit record", async () => {
    repositories.findOwnerById.mockResolvedValue({
      _id: currentOwnerId,
      name: "Fictional Current Owner",
      nationalId: "TEST-114",
      address: "Fictional address",
    });
    repositories.insertParcel.mockResolvedValue(parcel);
    let registrationEntries: LedgerEntryRecord[] = [];
    repositories.insertLedgerEntries.mockImplementation(
      async (entries: LedgerEntryRecord[]) => {
        registrationEntries = entries;
        return entries;
      },
    );

    const created = await registerParcel(authorityId.toString(), {
      mouza: parcel.mouza,
      dagNumber: "14",
      khatianNumber: parcel.khatianNumber,
      landType: parcel.landType,
      recordedAreaDecimal: parcel.recordedAreaDecimal,
      polygon: parcel.polygon,
      currentOwnerId: currentOwnerId.toString(),
    });

    expect(created).toEqual(parcel);
    expect(registrationEntries[0]).toMatchObject({
      seq: 1,
      type: "REGISTRATION",
      fromOwnerId: null,
      toOwnerId: currentOwnerId,
      prevHash: "GENESIS",
    });
    expect(verifyChain(registrationEntries, currentOwnerId)).toMatchObject({
      valid: true,
      entriesChecked: 1,
    });
    expect(repositories.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PARCEL_CREATE",
        targetType: "parcel",
      }),
      expect.anything(),
    );
  });
});
