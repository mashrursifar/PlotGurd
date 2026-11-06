import type { RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/app-error.js";
import { successResponse } from "../../utils/response.js";
import { parcelDagSearchSchema, parcelIdSchema } from "./parcel.schema.js";
import {
  getParcelDetail,
  getParcelList,
  searchParcelByDag,
} from "./parcel.service.js";

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
  const parsedId = parcelIdSchema.safeParse(request.params.id);
  if (!parsedId.success) {
    throw validationError(parsedId.error);
  }
  response
    .status(200)
    .json(successResponse(await getParcelDetail(parsedId.data)));
};
