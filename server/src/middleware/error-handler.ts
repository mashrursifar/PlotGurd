import type { ErrorRequestHandler } from "express";
import { failureResponse } from "../utils/response.js";

export const errorHandler: ErrorRequestHandler = (
  _error,
  _request,
  response,
  _next,
) => {
  response
    .status(500)
    .json(failureResponse("INTERNAL_ERROR", "An unexpected error occurred."));
};
