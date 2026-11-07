import { z } from "zod";

export const createEnquirySchema = z
  .object({
    parcelId: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/, "Parcel id must be a valid Mongo ObjectId."),
    question: z
      .string()
      .trim()
      .min(10, "Question must be at least 10 characters.")
      .max(1000, "Question must be 1000 characters or fewer."),
  })
  .strict();

export const replyEnquirySchema = z
  .object({
    reply: z
      .string()
      .trim()
      .min(1, "Reply must not be empty.")
      .max(1000, "Reply must be 1000 characters or fewer."),
  })
  .strict();

export const enquiryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["OPEN", "ANSWERED", "CLOSED"]).optional(),
  })
  .strict();
