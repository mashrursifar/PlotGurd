import { z } from "zod";

const seedConfigSchema = z.object({
  SEED_AUTHORITY_EMAIL: z.string().email(),
  SEED_AUTHORITY_PASSWORD: z.string().min(8).regex(/[A-Za-z]/).regex(/\d/),
  SEED_DEMO_USER_PASSWORD: z.string().min(8).regex(/[A-Za-z]/).regex(/\d/),
});

export interface SeedConfig {
  authorityEmail: string;
  authorityPassword: string;
  demoUserPassword: string;
}

export function getSeedConfig(): SeedConfig {
  const parsed = seedConfigSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      "Seed credentials are missing or invalid. Configure SEED_AUTHORITY_EMAIL, SEED_AUTHORITY_PASSWORD, and SEED_DEMO_USER_PASSWORD.",
    );
  }

  return {
    authorityEmail: parsed.data.SEED_AUTHORITY_EMAIL,
    authorityPassword: parsed.data.SEED_AUTHORITY_PASSWORD,
    demoUserPassword: parsed.data.SEED_DEMO_USER_PASSWORD,
  };
}
