import { OwnerModel, type Owner } from "./owner.model.js";
import type { ClientSession, FilterQuery } from "mongoose";

export async function insertOwners(owners: readonly Owner[]): Promise<Owner[]> {
  return OwnerModel.insertMany(owners);
}

export async function findOwnerById(id: string): Promise<Owner | null> {
  return OwnerModel.findById(id).lean().exec();
}

export async function findOwnersByIds(ids: readonly string[]): Promise<Owner[]> {
  return OwnerModel.find({ _id: { $in: ids } }).lean().exec();
}

export async function findOwnerNamesByIds(
  ids: readonly string[],
): Promise<Array<Pick<Owner, "_id" | "name">>> {
  return OwnerModel.find({ _id: { $in: ids } })
    .select({ name: 1 })
    .lean()
    .exec();
}

export async function createOwner(
  owner: Omit<Owner, "_id">,
  session: ClientSession,
): Promise<Owner> {
  const [created] = await OwnerModel.create([owner], { session });
  return created.toObject();
}

export async function listOwners(name?: string): Promise<Owner[]> {
  const filter: FilterQuery<Owner> = {};
  if (name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.name = { $regex: escapedName, $options: "i" };
  }
  return OwnerModel.find(filter).sort({ name: 1 }).lean().exec();
}

export async function findOwnerSummaryById(
  id: string,
): Promise<Pick<Owner, "_id" | "name"> | null> {
  return OwnerModel.findById(id).select({ name: 1 }).lean().exec();
}
