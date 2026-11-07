import { Types } from "mongoose";
import { withDatabaseTransaction } from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditLog } from "../audit/audit-log.service.js";
import { countParcelsByOwnerId } from "../parcels/parcel.repository.js";
import type { Owner } from "./owner.model.js";
import {
  createOwner as insertOwner,
  findOwnerSummaryById,
  listOwners as findOwners,
} from "./owner.repository.js";

export interface OwnerResponse {
  id: string;
  name: string;
  nationalId: string;
  address: string;
}

function ownerId(owner: Owner): string {
  if (!owner._id) {
    throw new AppError("INTERNAL_ERROR", 500, "An owner record has no identifier.");
  }
  return owner._id.toString();
}

function toResponse(owner: Owner): OwnerResponse {
  return {
    id: ownerId(owner),
    name: owner.name,
    nationalId: owner.nationalId,
    address: owner.address,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function createOwner(
  input: Omit<Owner, "_id">,
  authorityId: string,
): Promise<OwnerResponse> {
  try {
    const owner = await withDatabaseTransaction(async (session) => {
      const created = await insertOwner(input, session);
      await recordAuditLog(
        {
          actorId: new Types.ObjectId(authorityId),
          action: "OWNER_CREATE",
          targetType: "owner",
          targetId: new Types.ObjectId(ownerId(created)),
          summary: `Created owner ${created.name}.`,
        },
        session,
      );
      return created;
    });
    return toResponse(owner);
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("CONFLICT", 409, "An owner with this national ID already exists.");
    }
    throw error;
  }
}

export async function listOwners(name?: string): Promise<OwnerResponse[]> {
  return (await findOwners(name)).map(toResponse);
}

export async function getOwnerSummary(
  id: string,
): Promise<{ name: string; parcelCount: number }> {
  const owner = await findOwnerSummaryById(id);
  if (!owner) {
    throw new AppError("NOT_FOUND", 404, "Owner not found.");
  }
  return {
    name: owner.name,
    parcelCount: await countParcelsByOwnerId(id),
  };
}
