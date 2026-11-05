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
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default("7d")
    .transform((value) => {
      const amount = Number.parseInt(value, 10);
      const unit = value.at(-1);
      const secondsPerUnit = { s: 1, m: 60, h: 3600, d: 86400 } as const;
      return amount * secondsPerUnit[unit as keyof typeof secondsPerUnit];
    }),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const env = envSchema.parse(process.env);
