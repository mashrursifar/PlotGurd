import { Types } from "mongoose";
import { withDatabaseTransaction } from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditLog } from "../audit/audit-log.service.js";
import { findOwnerById, findOwnerNamesByIds } from "../owners/owner.repository.js";
import { findUserNamesByIds } from "../users/user.repository.js";
import {
  findParcelById,
  findParcelByIdInSession,
  insertParcel,
  updateParcelOwners,
} from "../parcels/parcel.repository.js";
import type { Parcel } from "../parcels/parcel.model.js";
import { insertLedgerEntries, listLedgerEntries } from "./ledger-entry.repository.js";
import type { LedgerEntryRecord } from "./ledger-entry.model.js";
import {
  computeEntryHash,
  verifyChain,
  type ChainVerification,
  type LedgerEntryType,
} from "./hash-chain.js";

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

export interface RecordTransactionInput {
  type: Exclude<LedgerEntryType, "REGISTRATION">;
  fromOwnerId: string | null;
  toOwnerId: string;
  effectiveDate: string;
  note?: string | null;
}

export interface RegisterParcelInput {
  mouza: string;
  dagNumber: string;
  khatianNumber: string;
  landType: Parcel["landType"];
  recordedAreaDecimal: number;
  polygon: Parcel["polygon"];
  currentOwnerId: string;
}

interface RecordedTransaction {
  seq: number;
  type: LedgerEntryType;
  fromOwner: string | null;
  toOwner: string;
  effectiveDate: Date;
  performedBy: string;
  source: "LIVE";
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

function isDuplicateSequenceError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function recordParcelTransaction(
  parcelId: string,
  authorityId: string,
  input: RecordTransactionInput,
): Promise<RecordedTransaction> {
  if (input.type === "CORRECTION" && !input.note?.trim()) {
    throw new AppError("VALIDATION_ERROR", 400, "A correction requires a note.");
  }

  const effectiveDate = new Date(input.effectiveDate);
  if (!Number.isFinite(effectiveDate.getTime())) {
    throw new AppError("VALIDATION_ERROR", 400, "Effective date must be valid.");
  }

  let created: LedgerEntryRecord;
  try {
    created = await withDatabaseTransaction(async (session) => {
      const parcel = await findParcelByIdInSession(parcelId, session);
      if (!parcel) {
        throw new AppError("NOT_FOUND", 404, "Parcel not found.");
      }

      const entries = await listLedgerEntries(parcelId, session);
      const verification = verifyChain(entries, parcel.currentOwnerId);
      if (!verification.valid) {
        throw new AppError(
          "CONFLICT",
          409,
          "Parcel history integrity must be valid before recording a transaction.",
        );
      }
      const latestEntry = entries[entries.length - 1];
      if (!latestEntry) {
        throw new AppError("CONFLICT", 409, "A parcel must have a registration entry.");
      }

      const currentOwnerId = parcel.currentOwnerId.toString();
      const toOwnerId = new Types.ObjectId(input.toOwnerId);
      const targetOwner = await findOwnerById(input.toOwnerId);
      if (!targetOwner) {
        throw new AppError("NOT_FOUND", 404, "Target owner not found.");
      }

      if (
        ["SALE", "INHERITANCE", "GIFT"].includes(input.type) &&
        input.fromOwnerId !== currentOwnerId
      ) {
        throw new AppError(
          "CONFLICT",
          409,
          "The from-owner must match the parcel's current owner.",
        );
      }
      if (input.fromOwnerId && !(await findOwnerById(input.fromOwnerId))) {
        throw new AppError("NOT_FOUND", 404, "From-owner not found.");
      }
      if (input.type === "MUTATION" && toOwnerId.toString() !== currentOwnerId) {
        throw new AppError(
          "CONFLICT",
          409,
          "A mutation must identify the parcel's current owner.",
        );
      }

      const fromOwnerId = input.fromOwnerId
        ? new Types.ObjectId(input.fromOwnerId)
        : null;
      const unsignedEntry = {
        parcelId: new Types.ObjectId(parcelId),
        seq: latestEntry.seq + 1,
        type: input.type,
        fromOwnerId,
        toOwnerId,
        effectiveDate,
        performedBy: new Types.ObjectId(authorityId),
        source: "LIVE" as const,
        note: input.note?.trim() || null,
        prevHash: latestEntry.entryHash,
      };
      const entry: LedgerEntryRecord = {
        ...unsignedEntry,
        entryHash: computeEntryHash(unsignedEntry),
      };

      await insertLedgerEntries([entry], session);

      const ownerUpdates =
        input.type === "MUTATION"
          ? { khatianOwnerId: toOwnerId }
          : input.type === "CORRECTION"
            ? { currentOwnerId: toOwnerId, khatianOwnerId: toOwnerId }
            : { currentOwnerId: toOwnerId };
      const updatedParcel = await updateParcelOwners(parcelId, ownerUpdates, session);
      if (!updatedParcel) {
        throw new AppError("NOT_FOUND", 404, "Parcel not found.");
      }

      await recordAuditLog(
        {
          actorId: new Types.ObjectId(authorityId),
          action: "LEDGER_APPEND",
          targetType: "parcel",
          targetId: new Types.ObjectId(parcelId),
          summary: `Recorded ${input.type.toLowerCase()} for parcel dag ${parcel.dagNumber}.`,
          meta: { seq: entry.seq, type: entry.type },
        },
        session,
      );
      return entry;
    });
  } catch (error: unknown) {
    if (isDuplicateSequenceError(error)) {
      throw new AppError(
        "CONFLICT",
        409,
        "A concurrent ledger update was detected. Retry the transaction.",
      );
    }
    throw error;
  }

  const ownerIds = [
    ...(created.fromOwnerId ? [created.fromOwnerId.toString()] : []),
    created.toOwnerId.toString(),
  ];
  const [ownerNames, performerNames] = await Promise.all([
    findOwnerNamesByIds([...new Set(ownerIds)]),
    findUserNamesByIds([created.performedBy.toString()]),
  ]);
  const namesById = new Map(
    ownerNames.flatMap((owner) =>
      owner._id ? [[owner._id.toString(), owner.name]] : [],
    ),
  );

  return {
    seq: created.seq,
    type: created.type,
    fromOwner: created.fromOwnerId
      ? requireName(namesById, created.fromOwnerId, "owner")
      : null,
    toOwner: requireName(namesById, created.toOwnerId, "owner"),
    effectiveDate: created.effectiveDate,
    performedBy: requireName(
      new Map(
        performerNames.flatMap((user) =>
          user._id ? [[user._id.toString(), user.name]] : [],
        ),
      ),
      created.performedBy,
      "performer",
    ),
    source: "LIVE",
    note: created.note,
    entryHash: created.entryHash,
  };
}

export async function registerParcel(
  authorityId: string,
  input: RegisterParcelInput,
): Promise<Parcel> {
  const owner = await findOwnerById(input.currentOwnerId);
  if (!owner) {
    throw new AppError("NOT_FOUND", 404, "Initial owner not found.");
  }

  try {
    return await withDatabaseTransaction(async (session) => {
      const ownerId = new Types.ObjectId(input.currentOwnerId);
      const parcel = await insertParcel(
        {
          mouza: input.mouza,
          dagNumber: input.dagNumber,
          khatianNumber: input.khatianNumber,
          landType: input.landType,
          recordedAreaDecimal: input.recordedAreaDecimal,
          polygon: input.polygon,
          currentOwnerId: ownerId,
          khatianOwnerId: ownerId,
          status: "ACTIVE",
          disputeFlag: false,
          disputeReason: null,
        },
        session,
      );
      const id = requireParcelId(parcel);
      const unsignedEntry = {
        parcelId: new Types.ObjectId(id),
        seq: 1,
        type: "REGISTRATION" as const,
        fromOwnerId: null,
        toOwnerId: ownerId,
        effectiveDate: new Date(),
        performedBy: new Types.ObjectId(authorityId),
        source: "LIVE" as const,
        note: null,
        prevHash: "GENESIS",
      };
      const entry: LedgerEntryRecord = {
        ...unsignedEntry,
        entryHash: computeEntryHash(unsignedEntry),
      };
      await insertLedgerEntries([entry], session);
      await recordAuditLog(
        {
          actorId: new Types.ObjectId(authorityId),
          action: "PARCEL_CREATE",
          targetType: "parcel",
          targetId: new Types.ObjectId(id),
          summary: `Registered parcel dag ${parcel.dagNumber}.`,
          meta: { seq: 1 },
        },
        session,
      );
      return parcel;
    });
  } catch (error: unknown) {
    if (isDuplicateSequenceError(error)) {
      throw new AppError(
        "CONFLICT",
        409,
        "A parcel with this mouza and dag number already exists.",
      );
    }
    throw error;
  }
}
