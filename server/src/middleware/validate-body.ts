import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/app-error.js";

export function validateBody<TSchema extends ZodType>(
  schema: TSchema,
): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      next(
        new AppError(
          "VALIDATION_ERROR",
          400,
          "Request validation failed.",
          details,
        ),
      );
      return;
    }

    request.body = result.data;
    next();
  };
}
