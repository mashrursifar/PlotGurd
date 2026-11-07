import { ParcelModel, type Parcel } from "./parcel.model.js";
import type { ClientSession } from "mongoose";

export type ParcelEditableFields = Pick<
  Parcel,
  | "khatianNumber"
  | "landType"
  | "recordedAreaDecimal"
  | "polygon"
  | "status"
>;

export async function insertParcels(parcels: readonly Parcel[]): Promise<Parcel[]> {
  return ParcelModel.insertMany(parcels);
}

export async function insertParcel(
  parcel: Omit<Parcel, "_id">,
  session: ClientSession,
): Promise<Parcel> {
  const [created] = await ParcelModel.create([parcel], { session });
  return created.toObject();
}

export async function findParcelById(id: string): Promise<Parcel | null> {
  return ParcelModel.findById(id).lean().exec();
}

export async function findParcelByIdInSession(
  id: string,
  session: ClientSession,
): Promise<Parcel | null> {
  return ParcelModel.findById(id).session(session).lean().exec();
}

export async function findParcelsByIds(ids: readonly string[]): Promise<Parcel[]> {
  return ParcelModel.find({ _id: { $in: ids } }).lean().exec();
}

export async function findParcelByDag(
  mouza: string,
  dagNumber: string,
): Promise<Parcel | null> {
  return ParcelModel.findOne({ mouza, dagNumber }).lean().exec();
}

export async function findParcelByDagNumber(dagNumber: string): Promise<Parcel | null> {
  return ParcelModel.findOne({ dagNumber }).lean().exec();
}

export async function listParcels(): Promise<Parcel[]> {
  return ParcelModel.find().sort({ dagNumber: 1 }).lean().exec();
}

export async function countParcelsByOwnerId(id: string): Promise<number> {
  return ParcelModel.countDocuments({ currentOwnerId: id }).exec();
}

export async function updateParcelFields(
  id: string,
  updates: Partial<ParcelEditableFields>,
  session: ClientSession,
): Promise<Parcel | null> {
  return ParcelModel.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
    session,
  })
    .lean()
    .exec();
}

export async function updateParcelOwners(
  id: string,
  ownerUpdates: Partial<Pick<Parcel, "currentOwnerId" | "khatianOwnerId">>,
  session: ClientSession,
): Promise<Parcel | null> {
  return ParcelModel.findByIdAndUpdate(id, ownerUpdates, {
    new: true,
    runValidators: true,
    session,
  })
    .lean()
    .exec();
}

export async function updateParcelDispute(
  id: string,
  disputeFlag: boolean,
  disputeReason: string | null,
  session: ClientSession,
): Promise<Parcel | null> {
  return ParcelModel.findByIdAndUpdate(
    id,
    { disputeFlag, disputeReason },
    { new: true, runValidators: true, session },
  )
    .lean()
    .exec();
}
