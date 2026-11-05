import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z
    .string()
    .min(1)
    .default("mongodb://127.0.0.1:27017/plot"),
  CLIENT_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  AREA_SCALE: z.coerce.number().positive().finite().default(1),
});

export const env = envSchema.parse(process.env);
