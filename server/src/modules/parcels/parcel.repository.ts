import { ParcelModel, type Parcel } from "./parcel.model.js";

export async function insertParcels(parcels: readonly Parcel[]): Promise<Parcel[]> {
  return ParcelModel.insertMany(parcels);
}

export async function findParcelById(id: string): Promise<Parcel | null> {
  return ParcelModel.findById(id).lean().exec();
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
