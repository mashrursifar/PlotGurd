import { Types } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import { findParcelById } from "../parcels/parcel.repository.js";
import {
  createEnquiry,
  findEnquiryById,
  listEnquiriesForUser,
  listEnquiriesPage,
  updateEnquiryById,
} from "./enquiry.repository.js";
import type { Enquiry, EnquiryStatus } from "./enquiry.model.js";

export interface EnquiryResponse {
  id: string;
  parcelId: string;
  userId: string;
  question: string;
  status: EnquiryStatus;
  reply: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
  createdAt: string;
}

function requireId(value: Types.ObjectId | undefined, recordName: string): string {
  if (!value) {
    throw new AppError("INTERNAL_ERROR", 500, `A ${recordName} has no identifier.`);
  }
  return value.toString();
}

function toResponse(enquiry: Enquiry): EnquiryResponse {
  const createdAt = enquiry.createdAt ? enquiry.createdAt.toISOString() : new Date(0).toISOString();

  return {
    id: requireId(enquiry._id, "enquiry"),
    parcelId: requireId(enquiry.parcelId, "enquiry parcel"),
    userId: requireId(enquiry.userId, "enquiry user"),
    question: enquiry.question,
    status: enquiry.status,
    reply: enquiry.reply,
    repliedBy: enquiry.repliedBy ? enquiry.repliedBy.toString() : null,
    repliedAt: enquiry.repliedAt ? enquiry.repliedAt.toISOString() : null,
    createdAt,
  };
}

export async function submitEnquiry(
  userId: string,
  parcelId: string,
  question: string,
): Promise<EnquiryResponse> {
  const parcel = await findParcelById(parcelId);
  if (!parcel) {
    throw new AppError("NOT_FOUND", 404, "Parcel not found.");
  }

  const created = await createEnquiry({
    parcelId: new Types.ObjectId(parcelId),
    userId: new Types.ObjectId(userId),
    question,
    status: "OPEN",
    reply: null,
    repliedBy: null,
    repliedAt: null,
  });

  return toResponse(created);
}

export async function getUserEnquiries(userId: string): Promise<EnquiryResponse[]> {
  const enquiries = await listEnquiriesForUser(userId);
  return enquiries.map(toResponse);
}

export async function getEnquiryInbox(
  page: number,
  limit: number,
  status?: EnquiryStatus,
): Promise<{ items: EnquiryResponse[]; page: number; limit: number; total: number }> {
  const { enquiries, total } = await listEnquiriesPage(page, limit, status);

  return {
    items: enquiries.map(toResponse),
    page,
    limit,
    total,
  };
}

export async function replyToEnquiry(
  enquiryId: string,
  authorityId: string,
  reply: string,
): Promise<EnquiryResponse> {
  const enquiry = await findEnquiryById(enquiryId);
  if (!enquiry) {
    throw new AppError("NOT_FOUND", 404, "Enquiry not found.");
  }

  if (enquiry.status === "CLOSED") {
    throw new AppError(
      "CONFLICT",
      409,
      "This enquiry is closed and cannot be updated.",
    );
  }

  const updated = await updateEnquiryById(enquiryId, {
    reply,
    status: "ANSWERED",
    repliedBy: new Types.ObjectId(authorityId),
    repliedAt: new Date(),
  });

  if (!updated) {
    throw new AppError("NOT_FOUND", 404, "Enquiry not found.");
  }

  return toResponse(updated);
}

export async function closeEnquiry(enquiryId: string): Promise<EnquiryResponse> {
  const enquiry = await findEnquiryById(enquiryId);
  if (!enquiry) {
    throw new AppError("NOT_FOUND", 404, "Enquiry not found.");
  }

  if (enquiry.status === "CLOSED") {
    throw new AppError(
      "CONFLICT",
      409,
      "This enquiry is already closed.",
    );
  }

  const updated = await updateEnquiryById(enquiryId, {
    status: "CLOSED",
    repliedAt: enquiry.repliedAt ?? new Date(),
  });

  if (!updated) {
    throw new AppError("NOT_FOUND", 404, "Enquiry not found.");
  }

  return toResponse(updated);
}
