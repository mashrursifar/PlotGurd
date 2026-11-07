import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error.js";
import { successResponse } from "../../utils/response.js";
import { parcelIdSchema } from "../parcels/parcel.schema.js";
import { createOwnerSchema, listOwnersSchema } from "./owner.schema.js";
import { createOwner, getOwnerSummary, listOwners } from "./owner.service.js";

function requireAuthorityId(request: Parameters<RequestHandler>[0]): string {
  if (!request.user) {
    throw new AppError("UNAUTHENTICATED", 401, "Authentication is required.");
  }
  return request.user.id;
}

export const createOwnerController: RequestHandler = async (request, response) => {
  const input = createOwnerSchema.parse(request.body);
  const owner = await createOwner(input, requireAuthorityId(request));
  response.status(201).json(successResponse(owner));
};

export const listOwnersController: RequestHandler = async (request, response) => {
  const parsedQuery = listOwnersSchema.safeParse(request.query);
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
  response.status(200).json(successResponse(await listOwners(parsedQuery.data.name)));
};

export const getOwnerSummaryController: RequestHandler = async (
  request,
  response,
) => {
  const parsedId = parcelIdSchema.safeParse(request.params.id);
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
  response
    .status(200)
    .json(successResponse(await getOwnerSummary(parsedId.data)));
};
