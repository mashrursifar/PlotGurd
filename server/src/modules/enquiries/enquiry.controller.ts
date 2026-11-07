import type { RequestHandler } from "express";
import { AppError } from "../../utils/app-error.js";
import { successResponse } from "../../utils/response.js";
import {
  createEnquirySchema,
  enquiryQuerySchema,
  replyEnquirySchema,
} from "./enquiry.schema.js";
import {
  closeEnquiry,
  getEnquiryInbox,
  getUserEnquiries,
  replyToEnquiry,
  submitEnquiry,
} from "./enquiry.service.js";

function requireSessionUser(request: Parameters<RequestHandler>[0]): string {
  if (!request.user) {
    throw new AppError("UNAUTHENTICATED", 401, "Authentication is required.");
  }
  return request.user.id;
}

function requireParamId(request: Parameters<RequestHandler>[0], name: string): string {
  const value = request.params?.[name];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0];
  }
  throw new AppError("VALIDATION_ERROR", 400, `${name} is required.`);
}

export const createEnquiryController: RequestHandler = async (request, response) => {
  const input = createEnquirySchema.parse(request.body);
  const enquiry = await submitEnquiry(requireSessionUser(request), input.parcelId, input.question);
  response.status(201).json(successResponse(enquiry));
};

export const listMyEnquiriesController: RequestHandler = async (request, response) => {
  const userId = requireSessionUser(request);
  response.status(200).json(successResponse(await getUserEnquiries(userId)));
};

export const listAuthorityEnquiriesController: RequestHandler = async (request, response) => {
  const query = enquiryQuerySchema.safeParse(request.query);
  if (!query.success) {
    const details = query.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new AppError("VALIDATION_ERROR", 400, "Request validation failed.", details);
  }

  const { page, limit, status } = query.data;
  response.status(200).json(successResponse(await getEnquiryInbox(page, limit, status)));
};

export const replyToEnquiryController: RequestHandler = async (request, response) => {
  const input = replyEnquirySchema.parse(request.body);
  const enquiry = await replyToEnquiry(
    requireParamId(request, "id"),
    requireSessionUser(request),
    input.reply,
  );
  response.status(200).json(successResponse(enquiry));
};

export const closeEnquiryController: RequestHandler = async (request, response) => {
  const enquiry = await closeEnquiry(requireParamId(request, "id"));
  response.status(200).json(successResponse(enquiry));
};
