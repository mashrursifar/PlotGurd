import type { RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/app-error.js";
import { successResponse } from "../../utils/response.js";
import { parcelDagSearchSchema, parcelIdSchema } from "./parcel.schema.js";
import {
  getParcelDetail,
  getParcelList,
  createRegisteredParcel,
  editParcel,
  searchParcelByDag,
  setParcelDispute,
} from "./parcel.service.js";
import {
  createParcelSchema,
  disputeFlagSchema,
  updateParcelSchema,
} from "./parcel.schema.js";

function requireSessionUser(request: Parameters<RequestHandler>[0]): string {
  if (!request.user) {
    throw new AppError("UNAUTHENTICATED", 401, "Authentication is required.");
  }
  return request.user.id;
}

function getParcelId(request: Parameters<RequestHandler>[0]): string {
  const parsedId = parcelIdSchema.safeParse(request.params.id);
  if (!parsedId.success) {
    throw validationError(parsedId.error);
  }
  return parsedId.data;
}

function validationError(error: ZodError): AppError {
  return new AppError(
    "VALIDATION_ERROR",
    400,
    "Request validation failed.",
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  );
}

export const listParcelsController: RequestHandler = async (_request, response) => {
  response.status(200).json(successResponse(await getParcelList()));
};

export const createParcelController: RequestHandler = async (
  request,
  response,
) => {
  const input = createParcelSchema.parse(request.body);
  const parcel = await createRegisteredParcel(
    input,
    requireSessionUser(request),
  );
  response.status(201).json(successResponse(parcel));
};

export const searchParcelController: RequestHandler = async (request, response) => {
  const parsedQuery = parcelDagSearchSchema.safeParse(request.query);
  if (!parsedQuery.success) {
    throw validationError(parsedQuery.error);
  }
  response
    .status(200)
    .json(successResponse(await searchParcelByDag(parsedQuery.data.dag)));
};

export const getParcelController: RequestHandler = async (request, response) => {
  response
    .status(200)
    .json(successResponse(await getParcelDetail(getParcelId(request))));
};

export const updateParcelController: RequestHandler = async (
  request,
  response,
) => {
  const input = updateParcelSchema.parse(request.body);
  const parcel = await editParcel(
    getParcelId(request),
    requireSessionUser(request),
    input,
  );
  response.status(200).json(successResponse(parcel));
};

export const setParcelDisputeController: RequestHandler = async (
  request,
  response,
) => {
  const input = disputeFlagSchema.parse(request.body);
  const parcel = await setParcelDispute(
    getParcelId(request),
    requireSessionUser(request),
    input.disputeFlag,
    input.disputeReason,
  );
  response.status(200).json(successResponse(parcel));
};
