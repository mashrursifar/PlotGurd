import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error.js";
import { successResponse } from "../../utils/response.js";
import { auditQuerySchema } from "./audit.schema.js";
import { getAuditLogPage } from "./audit-log.service.js";

export const listAuditLogsController: RequestHandler = async (
  request,
  response,
) => {
  const parsedQuery = auditQuerySchema.safeParse(request.query);
  if (!parsedQuery.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      400,
      "Request validation failed.",
      parsedQuery.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  const { page, limit, action, target } = parsedQuery.data;
  response
    .status(200)
    .json(successResponse(await getAuditLogPage(page, limit, { action, target })));
};
