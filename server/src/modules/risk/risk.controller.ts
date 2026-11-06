import type { RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../../utils/app-error.js";
import { successResponse } from "../../utils/response.js";
import { parcelIdSchema, riskAssessmentQuerySchema } from "./risk.schema.js";
import {
  assessParcelRisk,
  getAllRiskAssessments,
  getLatestParcelRiskAssessment,
  getUserRiskAssessments,
} from "./risk.service.js";

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

function requireSessionUser(request: Parameters<RequestHandler>[0]): string {
  if (!request.user) {
    throw new AppError("UNAUTHENTICATED", 401, "Authentication is required.");
  }
  return request.user.id;
}

function getParcelId(value: unknown): string {
  const result = parcelIdSchema.safeParse(value);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

export const assessParcelRiskController: RequestHandler = async (
  request,
  response,
) => {
  const report = await assessParcelRisk(
    getParcelId(request.params.id),
    requireSessionUser(request),
  );
  response.status(200).json(successResponse(report));
};

export const getLatestParcelRiskController: RequestHandler = async (
  request,
  response,
) => {
  const report = await getLatestParcelRiskAssessment(
    getParcelId(request.params.id),
    requireSessionUser(request),
  );
  response.status(200).json(successResponse(report));
};

export const getUserRiskAssessmentsController: RequestHandler = async (
  request,
  response,
) => {
  response
    .status(200)
    .json(successResponse(await getUserRiskAssessments(requireSessionUser(request))));
};

export const getAllRiskAssessmentsController: RequestHandler = async (
  request,
  response,
) => {
  const query = riskAssessmentQuerySchema.safeParse(request.query);
  if (!query.success) throw validationError(query.error);
  const { page, limit, band } = query.data;
  response
    .status(200)
    .json(successResponse(await getAllRiskAssessments(page, limit, band)));
};
