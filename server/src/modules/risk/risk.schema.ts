import { z } from "zod";
import { parcelIdSchema } from "../parcels/parcel.schema.js";

export const riskAssessmentQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    band: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  })
  .strict();

export const emptyRiskBodySchema = z.object({}).strict();

export { parcelIdSchema };
