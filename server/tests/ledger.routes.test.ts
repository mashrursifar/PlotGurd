import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositories = vi.hoisted(() => ({
  findUserById: vi.fn(),
}));
const ledgerService = vi.hoisted(() => ({
  getParcelHistory: vi.fn(),
  verifyParcelHistory: vi.fn(),
}));

vi.mock("../src/modules/users/user.repository.js", () => ({
  findUserById: repositories.findUserById,
}));
vi.mock("../src/modules/ledger/ledger.service.js", () => ledgerService);

import { env } from "../src/config/env.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { AUTH_COOKIE_NAME } from "../src/modules/auth/auth.controller.js";
import { parcelsRouter } from "../src/routes/parcels.js";
import { AppError } from "../src/utils/app-error.js";

const app = express();
app.use(cookieParser());
app.use("/api/parcels", parcelsRouter);
app.use(errorHandler);

const parcelId = new Types.ObjectId("660000000000000000000014");
const userId = new Types.ObjectId("6500000000000000000000a3");

function sessionCookie(): string {
  const token = jwt.sign({ sub: userId.toString() }, env.JWT_SECRET);
  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("parcel history API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repositories.findUserById.mockResolvedValue({
      _id: userId,
      name: "Test User",
      email: "test.user@plotguard.test",
      role: "user",
    });
    ledgerService.getParcelHistory.mockResolvedValue([
      {
        seq: 1,
        type: "REGISTRATION",
        fromOwner: null,
        toOwner: "Fictional Parcel Owner",
        effectiveDate: new Date("2025-01-01T00:00:00.000Z"),
        performedBy: "Fictional Authority",
        source: "LIVE",
        note: null,
        entryHash: "a".repeat(64),
      },
    ]);
    ledgerService.verifyParcelHistory.mockResolvedValue({
      valid: true,
      entriesChecked: 1,
      firstBrokenSeq: null,
      reason: null,
    });
  });

  it.each([
    `/api/parcels/${parcelId.toString()}/history`,
    `/api/parcels/${parcelId.toString()}/history/verify`,
  ])("requires authentication for %s", async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns a parcel's history using the shared response envelope", async () => {
    const response = await request(app)
      .get(`/api/parcels/${parcelId.toString()}/history`)
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        {
          seq: 1,
          type: "REGISTRATION",
          fromOwner: null,
          toOwner: "Fictional Parcel Owner",
          effectiveDate: "2025-01-01T00:00:00.000Z",
          performedBy: "Fictional Authority",
          source: "LIVE",
          note: null,
          entryHash: "a".repeat(64),
        },
      ],
    });
    expect(ledgerService.getParcelHistory).toHaveBeenCalledWith(
      parcelId.toString(),
    );
  });

  it("returns the integrity verification result", async () => {
    const response = await request(app)
      .get(`/api/parcels/${parcelId.toString()}/history/verify`)
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        valid: true,
        entriesChecked: 1,
        firstBrokenSeq: null,
        reason: null,
      },
    });
    expect(ledgerService.verifyParcelHistory).toHaveBeenCalledWith(
      parcelId.toString(),
    );
  });

  it.each([
    "/api/parcels/not-an-id/history",
    "/api/parcels/not-an-id/history/verify",
  ])("rejects malformed parcel ids for %s", async (path) => {
    const response = await request(app)
      .get(path)
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(ledgerService.getParcelHistory).not.toHaveBeenCalled();
    expect(ledgerService.verifyParcelHistory).not.toHaveBeenCalled();
  });

  it("returns not found when the service cannot find the parcel", async () => {
    ledgerService.getParcelHistory.mockRejectedValue(
      new AppError("NOT_FOUND", 404, "Parcel not found."),
    );

    const response = await request(app)
      .get(`/api/parcels/${parcelId.toString()}/history`)
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
    });
  });
});
