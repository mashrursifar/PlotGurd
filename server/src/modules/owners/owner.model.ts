import { model, Schema, Types } from "mongoose";

export interface Owner {
  _id?: Types.ObjectId;
  name: string;
  nationalId: string;
  address: string;
}

const ownerSchema = new Schema<Owner>(
  {
    name: { type: String, required: true, trim: true },
    nationalId: { type: String, required: true, unique: true, trim: true },
    address: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const OwnerModel = model<Owner>("Owner", ownerSchema);
