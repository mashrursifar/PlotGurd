import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositories = vi.hoisted(() => ({
  findUserById: vi.fn(),
}));
const riskService = vi.hoisted(() => ({
  assessParcelRisk: vi.fn(),
  getAllRiskAssessments: vi.fn(),
  getLatestParcelRiskAssessment: vi.fn(),
  getUserRiskAssessments: vi.fn(),
}));

vi.mock("../src/modules/users/user.repository.js", () => ({
  findUserById: repositories.findUserById,
}));
vi.mock("../src/modules/risk/risk.service.js", () => riskService);

import { env } from "../src/config/env.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { AUTH_COOKIE_NAME } from "../src/modules/auth/auth.controller.js";
import { parcelsRouter } from "../src/routes/parcels.js";
import { riskRouter } from "../src/routes/risk.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/parcels", parcelsRouter);
app.use("/api/risk", riskRouter);
app.use(errorHandler);

const parcelId = new Types.ObjectId("660000000000000000000014");
const userId = new Types.ObjectId("6500000000000000000000a3");
const report = {
  score: 20,
  band: "LOW",
  findings: [],
  ruleVersion: "1.0",
  generatedAt: "2026-01-01T00:00:00.000Z",
};

function sessionCookie(): string {
  const token = jwt.sign({ sub: userId.toString() }, env.JWT_SECRET);
  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("risk assessment API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repositories.findUserById.mockResolvedValue({
      _id: userId,
      name: "Test User",
      email: "test.user@plotguard.test",
      role: "user",
    });
    riskService.assessParcelRisk.mockResolvedValue(report);
    riskService.getLatestParcelRiskAssessment.mockResolvedValue(report);
    riskService.getUserRiskAssessments.mockResolvedValue([]);
    riskService.getAllRiskAssessments.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });
  });

  it.each([
    ["post", `/api/parcels/${parcelId.toString()}/risk`],
    ["get", `/api/parcels/${parcelId.toString()}/risk/latest`],
    ["get", "/api/risk/mine"],
    ["get", "/api/risk/all"],
  ] as const)("requires authentication for %s %s", async (method, path) => {
    const response =
      method === "post"
        ? await request(app).post(path)
        : await request(app).get(path);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("runs and returns a parcel risk assessment for a signed-in user", async () => {
    const response = await request(app)
      .post(`/api/parcels/${parcelId.toString()}/risk`)
      .set("Cookie", sessionCookie())
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: report });
    expect(riskService.assessParcelRisk).toHaveBeenCalledWith(
      parcelId.toString(),
      userId.toString(),
    );
  });

  it("returns the requesting user's latest assessment for a parcel", async () => {
    const response = await request(app)
      .get(`/api/parcels/${parcelId.toString()}/risk/latest`)
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(report);
    expect(riskService.getLatestParcelRiskAssessment).toHaveBeenCalledWith(
      parcelId.toString(),
      userId.toString(),
    );
  });

  it("lists only the requesting user's stored assessments", async () => {
    riskService.getUserRiskAssessments.mockResolvedValue([
      { id: "assessment-1", parcelId: parcelId.toString(), dagNumber: "14" },
    ]);
    const response = await request(app)
      .get("/api/risk/mine")
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      { id: "assessment-1", parcelId: parcelId.toString(), dagNumber: "14" },
    ]);
    expect(riskService.getUserRiskAssessments).toHaveBeenCalledWith(
      userId.toString(),
    );
  });

  it("rejects non-authorities from the global assessment list", async () => {
    const response = await request(app)
      .get("/api/risk/all")
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(riskService.getAllRiskAssessments).not.toHaveBeenCalled();
  });

  it("returns a filtered, paginated list to authorities", async () => {
    repositories.findUserById.mockResolvedValue({
      _id: userId,
      name: "Test Authority",
      email: "test.authority@plotguard.test",
      role: "authority",
    });
    riskService.getAllRiskAssessments.mockResolvedValue({
      items: [],
      page: 2,
      limit: 5,
      total: 12,
    });

    const response = await request(app)
      .get("/api/risk/all?page=2&limit=5&band=HIGH")
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      items: [],
      page: 2,
      limit: 5,
      total: 12,
    });
    expect(riskService.getAllRiskAssessments).toHaveBeenCalledWith(
      2,
      5,
      "HIGH",
    );
  });

  it("rejects invalid parcel ids and unknown or invalid list query fields", async () => {
    const invalidId = await request(app)
      .post("/api/parcels/not-an-id/risk")
      .set("Cookie", sessionCookie());
    repositories.findUserById.mockResolvedValue({
      _id: userId,
      name: "Test Authority",
      email: "test.authority@plotguard.test",
      role: "authority",
    });
    const invalidQuery = await request(app)
      .get("/api/risk/all?page=0&unknown=value")
      .set("Cookie", sessionCookie());

    expect(invalidId.status).toBe(400);
    expect(invalidId.body.error.code).toBe("VALIDATION_ERROR");
    expect(invalidQuery.status).toBe(400);
    expect(invalidQuery.body.error.code).toBe("VALIDATION_ERROR");
    expect(riskService.assessParcelRisk).not.toHaveBeenCalled();
    expect(riskService.getAllRiskAssessments).not.toHaveBeenCalled();
  });

  it("rejects unexpected fields in a risk assessment request", async () => {
    const response = await request(app)
      .post(`/api/parcels/${parcelId.toString()}/risk`)
      .set("Cookie", sessionCookie())
      .send({ userId: "another-user" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(riskService.assessParcelRisk).not.toHaveBeenCalled();
  });
});
