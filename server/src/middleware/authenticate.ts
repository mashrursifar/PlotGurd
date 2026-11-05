import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { findUserById } from "../modules/users/user.repository.js";
import type { SessionUser } from "../modules/auth/auth.service.js";
import { AUTH_COOKIE_NAME } from "../modules/auth/auth.controller.js";
import { AppError } from "../utils/app-error.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: SessionUser;
  }
}

export const authenticate: RequestHandler = async (request, _response, next) => {
  const token = request.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string") {
    next(new AppError("UNAUTHENTICATED", 401, "Authentication is required."));
    return;
  }

  let userId: string;
  try {
    const verified = jwt.verify(token, env.JWT_SECRET);
    if (
      typeof verified === "string" ||
      typeof verified.sub !== "string" ||
      !Types.ObjectId.isValid(verified.sub)
    ) {
      throw new AppError(
        "UNAUTHENTICATED",
        401,
        "Authentication is required.",
      );
    }
    userId = verified.sub;
  } catch (error: unknown) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError("UNAUTHENTICATED", 401, "Authentication is required."));
      return;
    }
    next(error);
    return;
  }

  const user = await findUserById(userId);
  if (!user?._id) {
    next(new AppError("UNAUTHENTICATED", 401, "Authentication is required."));
    return;
  }

  request.user = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
  next();
};
