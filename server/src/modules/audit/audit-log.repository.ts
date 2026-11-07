import { AuditLogModel, type AuditLog } from "./audit-log.model.js";
import type { ClientSession, FilterQuery } from "mongoose";

export async function insertAuditLogs(
  logs: readonly AuditLog[],
  session?: ClientSession,
): Promise<AuditLog[]> {
  return AuditLogModel.insertMany(logs, { session });
}

export async function listAuditLogs(
  page: number,
  limit: number,
  filters: { action?: string; target?: string } = {},
): Promise<{ logs: AuditLog[]; total: number }> {
  const query: FilterQuery<AuditLog> = {};
  if (filters.action) {
    query.action = filters.action;
  }
  if (filters.target) {
    query.$or = [
      { targetType: filters.target },
      { targetId: filters.target },
    ];
  }

  const [logs, total] = await Promise.all([
    AuditLogModel.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
    AuditLogModel.countDocuments(query).exec(),
  ]);
  return { logs, total };
}
