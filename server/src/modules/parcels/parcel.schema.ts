import { z } from "zod";

export const parcelIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);

export const parcelDagSearchSchema = z
  .object({
    dag: z.string().trim().min(1),
  })
  .strict();
