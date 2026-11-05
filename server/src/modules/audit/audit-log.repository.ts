import { AuditLogModel, type AuditLog } from "./audit-log.model.js";

export async function insertAuditLogs(logs: readonly AuditLog[]): Promise<AuditLog[]> {
  return AuditLogModel.insertMany(logs);
}

export async function listAuditLogs(page: number, limit: number): Promise<AuditLog[]> {
  return AuditLogModel.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
    .exec();
}
