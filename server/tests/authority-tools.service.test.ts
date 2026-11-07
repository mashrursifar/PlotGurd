import { Types, type ClientSession } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositories = vi.hoisted(() => ({
  withDatabaseTransaction: vi.fn(),
  createOwner: vi.fn(),
  findOwnerSummaryById: vi.fn(),
  listOwners: vi.fn(),
  findOwnersByIds: vi.fn(),
  updateParcelFields: vi.fn(),
  updateParcelDispute: vi.fn(),
  recordAuditLog: vi.fn(),
}));

vi.mock("../src/config/database.js", () => ({
  withDatabaseTransaction: repositories.withDatabaseTransaction,
}));
vi.mock("../src/modules/owners/owner.repository.js", () => ({
  createOwner: repositories.createOwner,
  findOwnerSummaryById: repositories.findOwnerSummaryById,
  listOwners: repositories.listOwners,
  findOwnersByIds: repositories.findOwnersByIds,
}));
vi.mock("../src/modules/parcels/parcel.repository.js", () => ({
  updateParcelFields: repositories.updateParcelFields,
  updateParcelDispute: repositories.updateParcelDispute,
}));
vi.mock("../src/modules/audit/audit-log.service.js", () => ({
  recordAuditLog: repositories.recordAuditLog,
}));
vi.mock("../src/modules/ledger/ledger.service.js", () => ({
  registerParcel: vi.fn(),
}));

import { createOwner } from "../src/modules/owners/owner.service.js";
import {
  editParcel,
  setParcelDispute,
} from "../src/modules/parcels/parcel.service.js";
import type { Parcel } from "../src/modules/parcels/parcel.model.js";

const parcelId = new Types.ObjectId("660000000000000000000014");
const ownerId = new Types.ObjectId("650000000000000000000114");
const authorityId = new Types.ObjectId("6500000000000000000000a1");
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

describe("authority write services", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repositories.withDatabaseTransaction.mockImplementation(
      async (operation: (session: ClientSession) => Promise<unknown>) =>
        operation({} as ClientSession),
    );
    repositories.createOwner.mockResolvedValue({
      _id: ownerId,
      name: "Fictional Owner",
      nationalId: "TEST-114",
      address: "Fictional address",
    });
    repositories.findOwnersByIds.mockResolvedValue([
      { _id: ownerId, name: "Fictional Owner" },
    ]);
    repositories.updateParcelFields.mockResolvedValue(parcel);
    repositories.updateParcelDispute.mockResolvedValue({
      ...parcel,
      disputeFlag: true,
      disputeReason: "Fictional reason.",
    });
  });

  it("creates an owner and writes its audit record in the transaction", async () => {
    await expect(
      createOwner(
        {
          name: "Fictional Owner",
          nationalId: "TEST-114",
          address: "Fictional address",
        },
        authorityId.toString(),
      ),
    ).resolves.toMatchObject({ id: ownerId.toString() });

    expect(repositories.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_CREATE",
        targetType: "owner",
        targetId: ownerId,
      }),
      expect.anything(),
    );
  });

  it("edits only non-owner parcel fields and records an audit log", async () => {
    await editParcel(parcelId.toString(), authorityId.toString(), {
      status: "UNDER_REVIEW",
    });

    expect(repositories.updateParcelFields).toHaveBeenCalledWith(
      parcelId.toString(),
      { status: "UNDER_REVIEW" },
      expect.anything(),
    );
    expect(repositories.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PARCEL_UPDATE",
        targetType: "parcel",
      }),
      expect.anything(),
    );
  });

  it("sets a dispute flag with its reason and records an audit log", async () => {
    const updated = await setParcelDispute(
      parcelId.toString(),
      authorityId.toString(),
      true,
      "Fictional reason.",
    );

    expect(updated.disputeFlag).toBe(true);
    expect(repositories.updateParcelDispute).toHaveBeenCalledWith(
      parcelId.toString(),
      true,
      "Fictional reason.",
      expect.anything(),
    );
    expect(repositories.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DISPUTE_SET",
        targetType: "parcel",
      }),
      expect.anything(),
    );
  });
});
