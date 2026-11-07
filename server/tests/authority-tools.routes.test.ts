import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const services = vi.hoisted(() => ({
  findUserById: vi.fn(),
  createRegisteredParcel: vi.fn(),
  editParcel: vi.fn(),
  setParcelDispute: vi.fn(),
  recordParcelTransaction: vi.fn(),
  createOwner: vi.fn(),
  listOwners: vi.fn(),
  getOwnerSummary: vi.fn(),
  getAuditLogPage: vi.fn(),
}));

vi.mock("../src/modules/users/user.repository.js", () => ({
  findUserById: services.findUserById,
}));
vi.mock("../src/modules/parcels/parcel.service.js", () => ({
  createRegisteredParcel: services.createRegisteredParcel,
  editParcel: services.editParcel,
  setParcelDispute: services.setParcelDispute,
  getParcelDetail: vi.fn(),
  getParcelList: vi.fn(),
  searchParcelByDag: vi.fn(),
}));
vi.mock("../src/modules/ledger/ledger.service.js", () => ({
  getParcelHistory: vi.fn(),
  verifyParcelHistory: vi.fn(),
  recordParcelTransaction: services.recordParcelTransaction,
}));
vi.mock("../src/modules/owners/owner.service.js", () => ({
  createOwner: services.createOwner,
  listOwners: services.listOwners,
  getOwnerSummary: services.getOwnerSummary,
}));
vi.mock("../src/modules/audit/audit-log.service.js", () => ({
  getAuditLogPage: services.getAuditLogPage,
}));

import { env } from "../src/config/env.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { AUTH_COOKIE_NAME } from "../src/modules/auth/auth.controller.js";
import { auditRouter } from "../src/routes/audit.js";
import { ownersRouter } from "../src/routes/owners.js";
import { parcelsRouter } from "../src/routes/parcels.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/parcels", parcelsRouter);
app.use("/api/owners", ownersRouter);
app.use("/api/audit", auditRouter);
app.use(errorHandler);

const authorityId = new Types.ObjectId("6500000000000000000000a1");
const userId = new Types.ObjectId("6500000000000000000000a3");
const parcelId = "660000000000000000000014";
const ownerId = "650000000000000000000114";

interface AuthorityRouteCase {
  method: "get" | "post" | "patch";
  path: string;
  body?: Record<string, unknown>;
  successStatus: number;
}

const authorityRoutes: AuthorityRouteCase[] = [
  {
    method: "post",
    path: "/api/parcels",
    body: {
      mouza: "Kalpanapur",
      dagNumber: "90",
      khatianNumber: "K-090",
      landType: "RESIDENTIAL",
      recordedAreaDecimal: 12,
      polygon: [[0, 0], [20, 0], [20, 20]],
      currentOwnerId: ownerId,
    },
    successStatus: 201,
  },
  {
    method: "patch",
    path: `/api/parcels/${parcelId}`,
    body: { status: "UNDER_REVIEW" },
    successStatus: 200,
  },
  {
    method: "patch",
    path: `/api/parcels/${parcelId}/dispute`,
    body: { disputeFlag: true, disputeReason: "Fictional test dispute." },
    successStatus: 200,
  },
  {
    method: "post",
    path: `/api/parcels/${parcelId}/transactions`,
    body: {
      type: "SALE",
      fromOwnerId: ownerId,
      toOwnerId: "650000000000000000000115",
      effectiveDate: "2025-01-02T00:00:00.000Z",
      note: null,
    },
    successStatus: 201,
  },
  {
    method: "get",
    path: "/api/owners",
    successStatus: 200,
  },
  {
    method: "post",
    path: "/api/owners",
    body: {
      name: "Fictional Owner",
      nationalId: "TEST-OWNER-001",
      address: "Fictional address",
    },
    successStatus: 201,
  },
  {
    method: "get",
    path: "/api/audit?page=1",
    successStatus: 200,
  },
];

function sessionCookie(id: Types.ObjectId): string {
  const token = jwt.sign({ sub: id.toString() }, env.JWT_SECRET);
  return `${AUTH_COOKIE_NAME}=${token}`;
}

function sendRequest(
  route: AuthorityRouteCase,
  identity?: Types.ObjectId,
): request.Test {
  let test: request.Test;
  if (route.method === "get") {
    test = request(app).get(route.path);
  } else if (route.method === "post") {
    test = request(app).post(route.path);
  } else {
    test = request(app).patch(route.path);
  }
  if (route.body) {
    test.send(route.body);
  }
  if (identity) {
    test.set("Cookie", sessionCookie(identity));
  }
  return test;
}

describe("authority tools API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    services.findUserById.mockImplementation(async (id: string) => {
      const isAuthority = id === authorityId.toString();
      return {
        _id: new Types.ObjectId(id),
        name: isAuthority ? "Fictional Authority" : "Fictional User",
        email: isAuthority ? "authority@example.test" : "user@example.test",
        role: isAuthority ? "authority" : "user",
      };
    });
    services.createRegisteredParcel.mockResolvedValue({ id: parcelId });
    services.editParcel.mockResolvedValue({ id: parcelId });
    services.setParcelDispute.mockResolvedValue({ id: parcelId });
    services.recordParcelTransaction.mockResolvedValue({ seq: 2 });
    services.createOwner.mockResolvedValue({ id: ownerId });
    services.listOwners.mockResolvedValue([]);
    services.getOwnerSummary.mockResolvedValue({ name: "Fictional Owner", parcelCount: 0 });
    services.getAuditLogPage.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });
  });

  it.each(authorityRoutes)(
    "requires authentication for $method $path",
    async (route) => {
      const response = await sendRequest(route);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    },
  );

  it.each(authorityRoutes)(
    "rejects a user role for $method $path",
    async (route) => {
      const response = await sendRequest(route, userId);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    },
  );

  it.each(authorityRoutes)(
    "allows an authority to use $method $path",
    async (route) => {
      const response = await sendRequest(route, authorityId);

      expect(response.status).toBe(route.successStatus);
      expect(response.body.success).toBe(true);
    },
  );

  it("rejects direct current-owner edits", async () => {
    const response = await sendRequest(
      {
        method: "patch",
        path: `/api/parcels/${parcelId}`,
        body: { currentOwnerId: ownerId },
        successStatus: 200,
      },
      authorityId,
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(services.editParcel).not.toHaveBeenCalled();
  });

  it("lets a logged-in user read the public owner summary", async () => {
    const response = await request(app)
      .get(`/api/owners/${ownerId}`)
      .set("Cookie", sessionCookie(userId));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ name: "Fictional Owner", parcelCount: 0 });
  });

  it("requires authentication to read an owner summary", async () => {
    const response = await request(app).get(`/api/owners/${ownerId}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});
