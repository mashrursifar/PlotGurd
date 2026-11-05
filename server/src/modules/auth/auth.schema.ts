import { z } from "zod";

const credentialsSchema = z
  .object({
    email: z.string().trim().email().transform((email) => email.toLowerCase()),
    password: z.string().min(1),
  })
  .strict();

export const signupSchema = z
  .object({
    name: z.string().trim().min(1),
    email: z.string().trim().email().transform((email) => email.toLowerCase()),
    password: z
      .string()
      .min(8)
      .regex(/[A-Za-z]/, "Password must include a letter.")
      .regex(/\d/, "Password must include a number."),
  })
  .strict();

export const loginSchema = credentialsSchema;

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
