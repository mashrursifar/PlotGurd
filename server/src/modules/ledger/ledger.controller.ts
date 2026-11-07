import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error.js";
import { successResponse } from "../../utils/response.js";
import { parcelIdSchema } from "../parcels/parcel.schema.js";
import { createTransactionSchema } from "../parcels/parcel.schema.js";
import {
  getParcelHistory,
  recordParcelTransaction,
  verifyParcelHistory,
} from "./ledger.service.js";

function requireAuthorityId(request: Parameters<RequestHandler>[0]): string {
  if (!request.user) {
    throw new AppError("UNAUTHENTICATED", 401, "Authentication is required.");
  }
  return request.user.id;
}

function getParcelId(value: unknown): string {
  const parsedId = parcelIdSchema.safeParse(value);
  if (!parsedId.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      400,
      "Request validation failed.",
      parsedId.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return parsedId.data;
}

export const getParcelHistoryController: RequestHandler = async (
  request,
  response,
) => {
  response
    .status(200)
    .json(successResponse(await getParcelHistory(getParcelId(request.params.id))));
};

export const verifyParcelHistoryController: RequestHandler = async (
  request,
  response,
) => {
  response
    .status(200)
    .json(
      successResponse(await verifyParcelHistory(getParcelId(request.params.id))),
    );
};

export const recordParcelTransactionController: RequestHandler = async (
    request,
    response,
) => {
    const input = createTransactionSchema.parse(request.body);
    const result = await recordParcelTransaction(
      getParcelId(request.params.id),
      requireAuthorityId(request),
      input,
    );
    response.status(201).json(successResponse(result));
};
