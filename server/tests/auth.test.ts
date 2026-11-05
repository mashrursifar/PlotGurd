import cookieParser from "cookie-parser";
import express from "express";
import { Types } from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface StoredUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "authority";
}

const repositories = vi.hoisted(() => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock("../src/modules/users/user.repository.js", () => repositories);

import { authenticate } from "../src/middleware/authenticate.js";
import { authorize } from "../src/middleware/authorize.js";
import { app } from "../src/app.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { successResponse } from "../src/utils/response.js";

const users = new Map<string, StoredUser>();
const authorityApp = express();
authorityApp.use(cookieParser());
authorityApp.get(
  "/authority",
  authenticate,
  authorize("authority"),
  (_request, response) => {
    response.status(200).json(successResponse({ access: "granted" }));
  },
);
authorityApp.use(errorHandler);

function getSessionCookie(response: request.Response): string {
  const setCookieHeader = response.headers["set-cookie"];
  if (!setCookieHeader?.[0]) {
    throw new Error("The auth response did not set a session cookie.");
  }
  return setCookieHeader[0].split(";")[0];
}

async function createAccount(
  email: string,
  role: StoredUser["role"] = "user",
): Promise<string> {
  const signupResponse = await request(app)
    .post("/api/auth/signup")
    .send({ name: "Test User", email, password: "example123" });
  expect(signupResponse.status).toBe(201);
  if (role === "user") return getSessionCookie(signupResponse);

  const user = users.get(email);
  if (!user) throw new Error("Expected the test account to be stored.");
  user.role = role;
  return getSessionCookie(signupResponse);
}

describe("authentication and role middleware", () => {
  beforeEach(() => {
    users.clear();
    vi.resetAllMocks();
    repositories.createUser.mockImplementation(
      async (input: Omit<StoredUser, "_id">): Promise<StoredUser> => {
        const user = { ...input, _id: new Types.ObjectId() };
        users.set(user.email, user);
        return user;
      },
    );
    repositories.findUserByEmail.mockImplementation(
      async (email: string): Promise<StoredUser | null> =>
        users.get(email) ?? null,
    );
    repositories.findUserById.mockImplementation(
      async (id: string): Promise<StoredUser | null> =>
        [...users.values()].find((user) => user._id.toString() === id) ?? null,
    );
  });

  it("returns 401 for a protected request without a session", async () => {
    const response = await request(authorityApp).get("/authority");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("returns 403 when a user reaches an authority-only route", async () => {
    const cookie = await createAccount("user@example.test");
    const response = await request(authorityApp)
      .get("/authority")
      .set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("allows an authority through an authority-only route", async () => {
    const cookie = await createAccount("authority@example.test", "authority");
    const response = await request(authorityApp)
      .get("/authority")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { access: "granted" },
    });
  });

  it("always creates a user account and never returns its password hash", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "New User",
        email: "new@example.test",
        password: "example123",
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: "New User",
      email: "new@example.test",
      role: "user",
    });
    expect(response.body.data).not.toHaveProperty("passwordHash");
    expect(getSessionCookie(response)).toContain("plotguard_session=");
    expect(users.get("new@example.test")?.role).toBe("user");
  });

  it("rejects a signup request that attempts to provide a role", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "New User",
        email: "role@example.test",
        password: "example123",
        role: "authority",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
    expect(users.has("role@example.test")).toBe(false);
  });

  it("returns field-specific validation details for invalid signup data", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "",
        email: "valid@example.test",
        password: "passwordonly",
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          { path: "name", message: expect.any(String) },
          { path: "password", message: "Password must include a number." },
        ]),
      },
    });
    expect(users.has("valid@example.test")).toBe(false);
  });

  it("restores the current user from the session cookie", async () => {
    const cookie = await createAccount("me@example.test");
    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email: "me@example.test",
      role: "user",
    });
  });

  it("logs in with a valid password and rejects invalid credentials generically", async () => {
    await createAccount("login@example.test");

    const successfulLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.test", password: "example123" });
    expect(successfulLogin.status).toBe(200);
    expect(successfulLogin.body.data).toMatchObject({
      email: "login@example.test",
      role: "user",
    });

    const failedLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.test", password: "wrongpass1" });
    expect(failedLogin.status).toBe(401);
    expect(failedLogin.body.error.message).toBe("Invalid email or password.");
  });

  it("clears the session cookie on logout", async () => {
    const cookie = await createAccount("logout@example.test");
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { message: "Logged out." },
    });
    expect(response.headers["set-cookie"]?.[0]).toContain("plotguard_session=;");
  });
});
