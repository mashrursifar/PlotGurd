import type { RequestHandler } from "express";
import type { Response } from "express";
import { env } from "../../config/env.js";
import { failureResponse, successResponse } from "../../utils/response.js";
import { loginSchema, signupSchema } from "./auth.schema.js";
import { login, signup } from "./auth.service.js";

export const AUTH_COOKIE_NAME = "plotguard_session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.COOKIE_SECURE,
  path: "/",
  maxAge: env.JWT_EXPIRES_IN * 1000,
};

function setSessionCookie(
  response: Response,
  token: string,
): void {
  response.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
}

export const signupController: RequestHandler = async (request, response) => {
  const input = signupSchema.parse(request.body);
  const session = await signup(input);
  setSessionCookie(response, session.token);
  response.status(201).json(successResponse(session.user));
};

export const loginController: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body);
  const session = await login(input);
  setSessionCookie(response, session.token);
  response.status(200).json(successResponse(session.user));
};

export const logoutController: RequestHandler = (_request, response) => {
  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    path: "/",
  });
  response.status(200).json(successResponse({ message: "Logged out." }));
};

export const meController: RequestHandler = (request, response) => {
  if (!request.user) {
    response
      .status(401)
      .json(failureResponse("UNAUTHENTICATED", "Authentication is required."));
    return;
  }
  response.status(200).json(successResponse(request.user));
};
