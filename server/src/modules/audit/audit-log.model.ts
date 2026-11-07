import { model, Schema, Types } from "mongoose";

export interface AuditLog {
  _id?: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId: Types.ObjectId;
  summary: string;
  meta?: Record<string, unknown>;
  createdAt?: Date;
}

const auditLogSchema = new Schema<AuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    summary: { type: String, required: true, trim: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const AuditLogModel = model<AuditLog>("AuditLog", auditLogSchema);
