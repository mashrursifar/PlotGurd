import { config as loadDotEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadDotEnv({ path: resolve(process.cwd(), ".env") });
loadDotEnv({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env"),
  override: false,
});

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
