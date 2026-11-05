import { afterEach, describe, expect, it, vi } from "vitest";
import { getHealth } from "../lib/api-client";

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
});
