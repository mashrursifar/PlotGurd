import { z } from "zod";

export const createOwnerSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    nationalId: z.string().trim().min(1).max(80),
    address: z.string().trim().min(1).max(300),
  })
  .strict();

export const listOwnersSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
  })
  .strict();
