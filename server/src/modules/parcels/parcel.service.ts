import { env } from "../../config/env.js";
import { withDatabaseTransaction } from "../../config/database.js";
import { Types } from "mongoose";
import { recordAuditLog } from "../audit/audit-log.service.js";
import { registerParcel, type RegisterParcelInput } from "../ledger/ledger.service.js";
import { findOwnersByIds } from "../owners/owner.repository.js";
import type { Owner } from "../owners/owner.model.js";
import type { Parcel } from "./parcel.model.js";
import {
  findParcelByDagNumber,
  findParcelById,
  listParcels,
  updateParcelDispute,
  updateParcelFields,
  type ParcelEditableFields,
} from "./parcel.repository.js";
import { polygonArea } from "../../utils/geometry.js";
import { AppError } from "../../utils/app-error.js";

interface ParcelMapItem {
  id: string;
  dagNumber: string;
  landType: Parcel["landType"];
  polygon: Parcel["polygon"];
  status: Parcel["status"];
  disputeFlag: boolean;
  ownerName: string;
}

interface ParcelOwnerSummary {
  id: string;
  name: string;
}

interface ParcelDetail {
  id: string;
  mouza: string;
  dagNumber: string;
  khatianNumber: string;
  landType: Parcel["landType"];
  recordedAreaDecimal: number;
  computedAreaDecimal: number;
  polygon: Parcel["polygon"];
  currentOwner: ParcelOwnerSummary;
  khatianOwner: ParcelOwnerSummary;
  status: Parcel["status"];
  disputeFlag: boolean;
  disputeReason: string | null;
}

function getOwnerMap(owners: readonly Owner[]): Map<string, ParcelOwnerSummary> {
  return new Map(
    owners.flatMap((owner) =>
      owner._id ? [[owner._id.toString(), { id: owner._id.toString(), name: owner.name }]] : [],
    ),
  );
}

function ownerSummary(
  ownerMap: ReadonlyMap<string, ParcelOwnerSummary>,
  ownerId: Parcel["currentOwnerId"],
): ParcelOwnerSummary {
  const owner = ownerMap.get(ownerId.toString());
  if (!owner) {
    throw new AppError(
      "INTERNAL_ERROR",
      500,
      "A parcel owner record could not be loaded.",
    );
  }
  return owner;
}

function parcelId(parcel: Parcel): string {
  if (!parcel._id) {
    throw new AppError("INTERNAL_ERROR", 500, "A parcel record has no identifier.");
  }
  return parcel._id.toString();
}

async function loadOwnerMap(parcels: readonly Parcel[]): Promise<Map<string, ParcelOwnerSummary>> {
  const ownerIds = [
    ...new Set(
      parcels.flatMap((parcel) => [
        parcel.currentOwnerId.toString(),
        parcel.khatianOwnerId.toString(),
      ]),
    ),
  ];
  return getOwnerMap(await findOwnersByIds(ownerIds));
}

export async function getParcelList(): Promise<ParcelMapItem[]> {
  const parcels = await listParcels();
  const ownerMap = await loadOwnerMap(parcels);

  return parcels.map((parcel) => ({
    id: parcelId(parcel),
    dagNumber: parcel.dagNumber,
    landType: parcel.landType,
    polygon: parcel.polygon,
    status: parcel.status,
    disputeFlag: parcel.disputeFlag,
    ownerName: ownerSummary(ownerMap, parcel.currentOwnerId).name,
  }));
}

export async function createRegisteredParcel(
  input: RegisterParcelInput,
  authorityId: string,
): Promise<ParcelDetail> {
  const parcel = await registerParcel(authorityId, input);
  return makeParcelDetail(parcel, await loadOwnerMap([parcel]));
}

export async function searchParcelByDag(dagNumber: string): Promise<ParcelDetail> {
  const parcel = await findParcelByDagNumber(dagNumber);
  if (!parcel) {
    throw new AppError("NOT_FOUND", 404, "Parcel not found.");
  }
  return makeParcelDetail(parcel, await loadOwnerMap([parcel]));
}

export async function getParcelDetail(id: string): Promise<ParcelDetail> {
  const parcel = await findParcelById(id);
  if (!parcel) {
    throw new AppError("NOT_FOUND", 404, "Parcel not found.");
  }
  return makeParcelDetail(parcel, await loadOwnerMap([parcel]));
}

export async function editParcel(
  id: string,
  authorityId: string,
  updates: Partial<ParcelEditableFields>,
): Promise<ParcelDetail> {
  const updated = await withDatabaseTransaction(async (session) => {
    const parcel = await updateParcelFields(id, updates, session);
    if (!parcel) {
      throw new AppError("NOT_FOUND", 404, "Parcel not found.");
    }
    await recordAuditLog(
      {
        actorId: new Types.ObjectId(authorityId),
        action: "PARCEL_UPDATE",
        targetType: "parcel",
        targetId: new Types.ObjectId(id),
        summary: `Updated parcel dag ${parcel.dagNumber}.`,
        meta: { fields: Object.keys(updates) },
      },
      session,
    );
    return parcel;
  });
  return makeParcelDetail(updated, await loadOwnerMap([updated]));
}

export async function setParcelDispute(
  id: string,
  authorityId: string,
  disputeFlag: boolean,
  disputeReason: string | null,
): Promise<ParcelDetail> {
  const updated = await withDatabaseTransaction(async (session) => {
    const parcel = await updateParcelDispute(
      id,
      disputeFlag,
      disputeReason,
      session,
    );
    if (!parcel) {
      throw new AppError("NOT_FOUND", 404, "Parcel not found.");
    }
    await recordAuditLog(
      {
        actorId: new Types.ObjectId(authorityId),
        action: disputeFlag ? "DISPUTE_SET" : "DISPUTE_CLEARED",
        targetType: "parcel",
        targetId: new Types.ObjectId(id),
        summary: disputeFlag
          ? `Set a dispute flag on parcel dag ${parcel.dagNumber}.`
          : `Cleared the dispute flag on parcel dag ${parcel.dagNumber}.`,
        meta: { disputeReason },
      },
      session,
    );
    return parcel;
  });
  return makeParcelDetail(updated, await loadOwnerMap([updated]));
}

function makeParcelDetail(
  parcel: Parcel,
  ownerMap: ReadonlyMap<string, ParcelOwnerSummary>,
): ParcelDetail {
  return {
    id: parcelId(parcel),
    mouza: parcel.mouza,
    dagNumber: parcel.dagNumber,
    khatianNumber: parcel.khatianNumber,
    landType: parcel.landType,
    recordedAreaDecimal: parcel.recordedAreaDecimal,
    computedAreaDecimal: polygonArea(parcel.polygon) * env.AREA_SCALE,
    polygon: parcel.polygon,
    currentOwner: ownerSummary(ownerMap, parcel.currentOwnerId),
    khatianOwner: ownerSummary(ownerMap, parcel.khatianOwnerId),
    status: parcel.status,
    disputeFlag: parcel.disputeFlag,
    disputeReason: parcel.disputeReason,
  };
}
