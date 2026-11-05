import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { AppError } from "../utils/app-error.js";
import { failureResponse } from "../utils/response.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    response
      .status(error.status)
      .json(failureResponse(error.code, error.message, error.details));
    return;
  }

  const errorName =
    error instanceof Error ? error.name : "UnknownError";
  console.error("Unhandled API error", {
    method: request.method,
    path: request.path,
    errorName,
  });

  if (error instanceof mongoose.Error.MongooseServerSelectionError) {
    response
      .status(500)
      .json(
        failureResponse(
          "INTERNAL_ERROR",
          "The database is temporarily unavailable. Please try again shortly.",
        ),
      );
    return;
  }

  response
    .status(500)
    .json(failureResponse("INTERNAL_ERROR", "An unexpected error occurred."));
};
