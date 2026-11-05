import { model, Schema, Types } from "mongoose";

export type EnquiryStatus = "OPEN" | "ANSWERED" | "CLOSED";

export interface Enquiry {
  _id?: Types.ObjectId;
  parcelId: Types.ObjectId;
  userId: Types.ObjectId;
  question: string;
  status: EnquiryStatus;
  reply: string | null;
  repliedBy: Types.ObjectId | null;
  repliedAt: Date | null;
}

const enquirySchema = new Schema<Enquiry>(
  {
    parcelId: { type: Schema.Types.ObjectId, required: true, ref: "Parcel" },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    question: { type: String, required: true, minlength: 10, maxlength: 1000 },
    status: { type: String, enum: ["OPEN", "ANSWERED", "CLOSED"], default: "OPEN" },
    reply: { type: String, default: null },
    repliedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    repliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const EnquiryModel = model<Enquiry>("Enquiry", enquirySchema);
