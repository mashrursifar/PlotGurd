import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentUser,
  getHealth,
  signupUser,
} from "../lib/api-client";

describe("API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unwraps the health endpoint response envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { status: "ok", database: "disconnected" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(getHealth()).resolves.toEqual({
      status: "ok",
      database: "disconnected",
    });
  });

  it("sends signup credentials with cookies and no role field", async () => {
    const user = {
      id: "660000000000000000000001",
      name: "Demo User",
      email: "demo@example.test",
      role: "user",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: user }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      signupUser({
        name: "Demo User",
        email: "demo@example.test",
        password: "example123",
      }),
    ).resolves.toEqual(user);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          name: "Demo User",
          email: "demo@example.test",
          password: "example123",
        }),
      }),
    );
  });

  it("treats a 401 current-user response as a signed-out session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "UNAUTHENTICATED",
              message: "Authentication is required.",
              details: [],
            },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("explains non-JSON API responses instead of showing a JSON parse error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<!doctype html><title>Proxy error</title>", {
          status: 500,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );

    await expect(
      signupUser({
        name: "Demo User",
        email: "demo@example.test",
        password: "example123",
      }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_API_RESPONSE",
      message:
        "The API returned a non-JSON response (HTTP 500). Check the server terminal for startup errors.",
    });
  });

  it("preserves field validation messages for the form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Request validation failed.",
              details: [
                {
                  path: "password",
                  message: "Password must include a number.",
                },
              ],
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      signupUser({
        name: "Demo User",
        email: "demo@example.test",
        password: "examplepassword",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: [
        {
          path: "password",
          message: "Password must include a number.",
        },
      ],
    });
  });
});
