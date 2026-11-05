import type { RequestHandler } from "express";
import type { UserRole } from "../modules/users/user.model.js";
import { AppError } from "../utils/app-error.js";

export function authorize(role: UserRole): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new AppError("UNAUTHENTICATED", 401, "Authentication is required."));
      return;
    }
    if (request.user.role !== role) {
      next(new AppError("FORBIDDEN", 403, "You do not have permission."));
      return;
    }
    next();
  };
}
