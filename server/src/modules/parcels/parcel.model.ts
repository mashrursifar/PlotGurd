import { model, Schema, Types } from "mongoose";

export const LAND_TYPES = [
  "AGRICULTURAL",
  "RESIDENTIAL",
  "COMMERCIAL",
  "WETLAND",
  "GOVERNMENT",
] as const;
export const PARCEL_STATUSES = ["ACTIVE", "UNDER_REVIEW"] as const;

export type LandType = (typeof LAND_TYPES)[number];
export type ParcelStatus = (typeof PARCEL_STATUSES)[number];

export interface Parcel {
  _id?: Types.ObjectId;
  mouza: string;
  dagNumber: string;
  khatianNumber: string;
  landType: LandType;
  recordedAreaDecimal: number;
  polygon: [number, number][];
  currentOwnerId: Types.ObjectId;
  khatianOwnerId: Types.ObjectId;
  status: ParcelStatus;
  disputeFlag: boolean;
  disputeReason: string | null;
}

const parcelSchema = new Schema<Parcel>(
  {
    mouza: { type: String, required: true, trim: true },
    dagNumber: { type: String, required: true, trim: true },
    khatianNumber: { type: String, required: true, trim: true },
    landType: { type: String, enum: LAND_TYPES, required: true },
    recordedAreaDecimal: { type: Number, required: true, min: 0 },
    polygon: {
      type: [[Number]],
      required: true,
      validate: {
        validator: (polygon: number[][]) =>
          polygon.length >= 3 &&
          polygon.every(
            (point) =>
              point.length === 2 &&
              point.every(Number.isFinite) &&
              point[0] >= 0 &&
              point[0] <= 1000 &&
              point[1] >= 0 &&
              point[1] <= 700,
          ),
        message: "Polygon must have at least three [x, y] points within map bounds.",
      },
    },
    currentOwnerId: { type: Schema.Types.ObjectId, ref: "Owner", required: true },
    khatianOwnerId: { type: Schema.Types.ObjectId, ref: "Owner", required: true },
    status: { type: String, enum: PARCEL_STATUSES, default: "ACTIVE", required: true },
    disputeFlag: { type: Boolean, default: false, required: true },
    disputeReason: { type: String, default: null },
  },
  { timestamps: true },
);

parcelSchema.index({ mouza: 1, dagNumber: 1 }, { unique: true });

export const ParcelModel = model<Parcel>("Parcel", parcelSchema);
