import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentUser,
  getHealth,
  getParcelDetail,
  getParcels,
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

  it("loads the map parcels from the authenticated parcel endpoint", async () => {
    const parcels = [
      {
        id: "660000000000000000000014",
        dagNumber: "14",
        landType: "RESIDENTIAL",
        polygon: [
          [0, 0],
          [20, 0],
          [20, 10],
        ],
        status: "ACTIVE",
        disputeFlag: false,
        ownerName: "Fictional Owner",
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: parcels }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getParcels()).resolves.toEqual(parcels);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/parcels",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("rejects malformed parcel map responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [{ dagNumber: "14" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(getParcels()).rejects.toThrow(
      "The API returned an invalid parcel list.",
    );
  });

  it("loads parcel detail with owner summaries", async () => {
    const detail = {
      id: "660000000000000000000014",
      mouza: "Kalpanapur",
      dagNumber: "14",
      khatianNumber: "K-014",
      landType: "RESIDENTIAL",
      recordedAreaDecimal: 100,
      computedAreaDecimal: 200,
      polygon: [
        [0, 0],
        [20, 0],
        [20, 10],
      ],
      currentOwner: {
        id: "650000000000000000000114",
        name: "Fictional Owner",
      },
      khatianOwner: {
        id: "650000000000000000000115",
        name: "Fictional Khatian Owner",
      },
      status: "ACTIVE",
      disputeFlag: false,
      disputeReason: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: detail }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getParcelDetail(detail.id)).resolves.toEqual(detail);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/parcels/${detail.id}`,
      expect.objectContaining({ credentials: "include" }),
    );
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
