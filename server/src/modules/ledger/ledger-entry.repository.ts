import { LedgerEntryModel, type LedgerEntryRecord } from "./ledger-entry.model.js";
import type { ClientSession } from "mongoose";

export async function insertLedgerEntries(
  entries: readonly LedgerEntryRecord[],
  session?: ClientSession,
): Promise<LedgerEntryRecord[]> {
  return LedgerEntryModel.insertMany(entries, { session });
}

export async function listLedgerEntries(
  parcelId: string,
  session?: ClientSession,
): Promise<LedgerEntryRecord[]> {
  const query = LedgerEntryModel.find({ parcelId }).sort({ seq: 1 });
  if (session) {
    query.session(session);
  }
  return query.lean().exec();
}

export async function findLedgerEntry(
  parcelId: string,
  seq: number,
): Promise<LedgerEntryRecord | null> {
  return LedgerEntryModel.findOne({ parcelId, seq }).lean().exec();
}
