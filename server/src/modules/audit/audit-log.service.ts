import { Types, type ClientSession } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import { insertAuditLogs, listAuditLogs } from "./audit-log.repository.js";
import type { AuditLog } from "./audit-log.model.js";

export interface AuditLogResponse {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

function requireId(value: Types.ObjectId | undefined, name: string): string {
  if (!value) {
    throw new AppError("INTERNAL_ERROR", 500, `An audit ${name} has no identifier.`);
  }
  return value.toString();
}

function toResponse(log: AuditLog): AuditLogResponse {
  if (!log.createdAt) {
    throw new AppError("INTERNAL_ERROR", 500, "An audit log has no creation date.");
  }
  return {
    id: requireId(log._id, "log"),
    actorId: requireId(log.actorId, "actor"),
    action: log.action,
    targetType: log.targetType,
    targetId: requireId(log.targetId, "target"),
    summary: log.summary,
    meta: log.meta ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

export async function recordAuditLog(
  input: Omit<AuditLog, "_id" | "createdAt">,
  session: ClientSession,
): Promise<void> {
  await insertAuditLogs([input], session);
}

export async function getAuditLogPage(
  page: number,
  limit: number,
  filters: { action?: string; target?: string },
): Promise<{
  items: AuditLogResponse[];
  page: number;
  limit: number;
  total: number;
}> {
  const { logs, total } = await listAuditLogs(page, limit, filters);
  return { items: logs.map(toResponse), page, limit, total };
}
