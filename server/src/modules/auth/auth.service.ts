import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import {
  createUser,
  findUserByEmail,
} from "../users/user.repository.js";
import type { User, UserRole } from "../users/user.model.js";
import type { LoginInput, SignupInput } from "./auth.schema.js";

const BCRYPT_ROUNDS = 12;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  user: SessionUser;
  token: string;
}

function toSessionUser(user: User): SessionUser {
  if (!user._id) {
    throw new AppError(
      "INTERNAL_ERROR",
      500,
      "The account could not be loaded.",
    );
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function createSession(user: User): AuthSession {
  const sessionUser = toSessionUser(user);
  const token = jwt.sign({ sub: sessionUser.id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return { user: sessionUser, token };
}

export async function signup(input: SignupInput): Promise<AuthSession> {
  const existingUser = await findUserByEmail(input.email);
  if (existingUser) {
    throw new AppError("CONFLICT", 409, "An account with this email already exists.");
  }

  let user: User;
  try {
    user = await createUser({
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      role: "user",
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError(
        "CONFLICT",
        409,
        "An account with this email already exists.",
      );
    }
    throw error;
  }

  return createSession(user);
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const user = await findUserByEmail(input.email);
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError("UNAUTHENTICATED", 401, "Invalid email or password.");
  }

  return createSession(user);
}
