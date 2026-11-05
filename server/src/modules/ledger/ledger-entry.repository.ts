import { LedgerEntryModel, type LedgerEntryRecord } from "./ledger-entry.model.js";

export async function insertLedgerEntries(
  entries: readonly LedgerEntryRecord[],
): Promise<LedgerEntryRecord[]> {
  return LedgerEntryModel.insertMany(entries);
}

export async function listLedgerEntries(
  parcelId: string,
): Promise<LedgerEntryRecord[]> {
  return LedgerEntryModel.find({ parcelId }).sort({ seq: 1 }).lean().exec();
}

export async function findLedgerEntry(
  parcelId: string,
  seq: number,
): Promise<LedgerEntryRecord | null> {
  return LedgerEntryModel.findOne({ parcelId, seq }).lean().exec();
}
