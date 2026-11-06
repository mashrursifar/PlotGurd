import { OwnerModel, type Owner } from "./owner.model.js";

export async function insertOwners(owners: readonly Owner[]): Promise<Owner[]> {
  return OwnerModel.insertMany(owners);
}

export async function findOwnerById(id: string): Promise<Owner | null> {
  return OwnerModel.findById(id).lean().exec();
}

export async function findOwnersByIds(ids: readonly string[]): Promise<Owner[]> {
  return OwnerModel.find({ _id: { $in: ids } }).lean().exec();
}
