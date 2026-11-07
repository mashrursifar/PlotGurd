import { z } from "zod";

export const auditQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    action: z.string().trim().min(1).max(100).optional(),
    target: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
