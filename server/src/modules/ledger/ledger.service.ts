import { AppError } from "../../utils/app-error.js";
import { findOwnerNamesByIds } from "../owners/owner.repository.js";
import { findUserNamesByIds } from "../users/user.repository.js";
import { findParcelById } from "../parcels/parcel.repository.js";
import type { Parcel } from "../parcels/parcel.model.js";
import { listLedgerEntries } from "./ledger-entry.repository.js";
import type { LedgerEntryRecord } from "./ledger-entry.model.js";
import { verifyChain, type ChainVerification } from "./hash-chain.js";

export interface LedgerHistoryEntry {
  seq: number;
  type: LedgerEntryRecord["type"];
  fromOwner: string | null;
  toOwner: string;
  effectiveDate: Date;
  performedBy: string;
  source: LedgerEntryRecord["source"];
  note: string | null;
  entryHash: string;
}

function requireParcelId(parcel: Parcel): string {
  if (!parcel._id) {
    throw new AppError(
      "INTERNAL_ERROR",
      500,
      "A parcel record has no identifier.",
    );
  }
  return parcel._id.toString();
}

function requireName(
  names: ReadonlyMap<string, string>,
  id: LedgerEntryRecord["toOwnerId"] | LedgerEntryRecord["performedBy"],
  recordType: string,
): string {
  const name = names.get(id.toString());
  if (!name) {
    throw new AppError(
      "INTERNAL_ERROR",
      500,
      `A ledger ${recordType} record could not be loaded.`,
    );
  }
  return name;
}

async function loadParcel(parcelId: string): Promise<Parcel> {
  const parcel = await findParcelById(parcelId);
  if (!parcel) {
    throw new AppError("NOT_FOUND", 404, "Parcel not found.");
  }
  return parcel;
}

async function getOwnerNames(
  entries: readonly LedgerEntryRecord[],
): Promise<Map<string, string>> {
  const ownerIds = [
    ...new Set(
      entries.flatMap((entry) =>
        entry.fromOwnerId
          ? [entry.fromOwnerId.toString(), entry.toOwnerId.toString()]
          : [entry.toOwnerId.toString()],
      ),
    ),
  ];
  const owners = await findOwnerNamesByIds(ownerIds);

  return new Map(
    owners.flatMap((owner) =>
      owner._id ? [[owner._id.toString(), owner.name]] : [],
    ),
  );
}

async function getPerformerNames(
  entries: readonly LedgerEntryRecord[],
): Promise<Map<string, string>> {
  const performerIds = [
    ...new Set(entries.map((entry) => entry.performedBy.toString())),
  ];
  const users = await findUserNamesByIds(performerIds);

  return new Map(
    users.flatMap((user) =>
      user._id ? [[user._id.toString(), user.name]] : [],
    ),
  );
}

export async function getParcelHistory(
  parcelId: string,
): Promise<LedgerHistoryEntry[]> {
  const parcel = await loadParcel(parcelId);
  const entries = await listLedgerEntries(requireParcelId(parcel));
  const [ownerNames, performerNames] = await Promise.all([
    getOwnerNames(entries),
    getPerformerNames(entries),
  ]);

  return entries.map((entry) => ({
    seq: entry.seq,
    type: entry.type,
    fromOwner: entry.fromOwnerId
      ? requireName(ownerNames, entry.fromOwnerId, "owner")
      : null,
    toOwner: requireName(ownerNames, entry.toOwnerId, "owner"),
    effectiveDate: entry.effectiveDate,
    performedBy: requireName(performerNames, entry.performedBy, "performer"),
    source: entry.source,
    note: entry.note,
    entryHash: entry.entryHash,
  }));
}

export async function verifyParcelHistory(
  parcelId: string,
): Promise<ChainVerification> {
  const parcel = await loadParcel(parcelId);
  const entries = await listLedgerEntries(requireParcelId(parcel));

  return verifyChain(entries, parcel.currentOwnerId);
}
