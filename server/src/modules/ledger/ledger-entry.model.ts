import { model, Schema, Types } from "mongoose";
import type { LedgerEntrySource, LedgerEntryType } from "./hash-chain.js";

export interface LedgerEntryRecord {
  _id?: Types.ObjectId;
  parcelId: Types.ObjectId;
  seq: number;
  type: LedgerEntryType;
  fromOwnerId: Types.ObjectId | null;
  toOwnerId: Types.ObjectId;
  effectiveDate: Date;
  performedBy: Types.ObjectId;
  source: LedgerEntrySource;
  note: string | null;
  prevHash: string;
  entryHash: string;
}

const ledgerEntrySchema = new Schema<LedgerEntryRecord>(
  {
    parcelId: { type: Schema.Types.ObjectId, required: true, ref: "Parcel" },
    seq: { type: Number, required: true, min: 1, validate: Number.isInteger },
    type: {
      type: String,
      enum: ["REGISTRATION", "SALE", "INHERITANCE", "GIFT", "MUTATION", "CORRECTION"],
      required: true,
    },
    fromOwnerId: { type: Schema.Types.ObjectId, ref: "Owner", default: null },
    toOwnerId: { type: Schema.Types.ObjectId, ref: "Owner", required: true },
    effectiveDate: { type: Date, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    source: { type: String, enum: ["LIVE", "LEGACY_IMPORT"], required: true },
    note: { type: String, default: null },
    prevHash: { type: String, required: true },
    entryHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ledgerEntrySchema.index({ parcelId: 1, seq: 1 }, { unique: true });

export const LedgerEntryModel = model<LedgerEntryRecord>(
  "LedgerEntry",
  ledgerEntrySchema,
);
