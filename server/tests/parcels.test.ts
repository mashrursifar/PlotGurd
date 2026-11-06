import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositories = vi.hoisted(() => ({
  findUserById: vi.fn(),
  findParcelByDagNumber: vi.fn(),
  findParcelById: vi.fn(),
  listParcels: vi.fn(),
  findOwnersByIds: vi.fn(),
}));

vi.mock("../src/modules/users/user.repository.js", () => ({
  findUserById: repositories.findUserById,
}));
vi.mock("../src/modules/parcels/parcel.repository.js", () => ({
  findParcelByDagNumber: repositories.findParcelByDagNumber,
  findParcelById: repositories.findParcelById,
  listParcels: repositories.listParcels,
}));
vi.mock("../src/modules/owners/owner.repository.js", () => ({
  findOwnersByIds: repositories.findOwnersByIds,
}));

import { env } from "../src/config/env.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { AUTH_COOKIE_NAME } from "../src/modules/auth/auth.controller.js";
import { parcelsRouter } from "../src/routes/parcels.js";
import type { Parcel } from "../src/modules/parcels/parcel.model.js";
import type { Owner } from "../src/modules/owners/owner.model.js";

const app = express();
app.use(cookieParser());
app.use("/api/parcels", parcelsRouter);
app.use(errorHandler);

const parcelId = new Types.ObjectId("660000000000000000000014");
const currentOwnerId = new Types.ObjectId("650000000000000000000114");
const khatianOwnerId = new Types.ObjectId("650000000000000000000115");
const parcel: Parcel = {
  _id: parcelId,
  mouza: "Kalpanapur",
  dagNumber: "14",
  khatianNumber: "K-014",
  landType: "RESIDENTIAL",
  recordedAreaDecimal: 100,
  polygon: [
    [0, 0],
    [20, 0],
    [20, 10],
    [0, 10],
  ],
  currentOwnerId,
  khatianOwnerId,
  status: "ACTIVE",
  disputeFlag: false,
  disputeReason: null,
};
const owners: Owner[] = [
  { _id: currentOwnerId, name: "Fictional Current Owner", nationalId: "test-1", address: "Fictional" },
  { _id: khatianOwnerId, name: "Fictional Khatian Owner", nationalId: "test-2", address: "Fictional" },
];

function sessionCookie(): string {
  const token = jwt.sign(
    { sub: new Types.ObjectId("6500000000000000000000a3").toString() },
    env.JWT_SECRET,
  );
  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("parcel API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repositories.findUserById.mockResolvedValue({
      _id: new Types.ObjectId("6500000000000000000000a3"),
      name: "Test User",
      email: "test.user@plotguard.test",
      role: "user",
    });
    repositories.listParcels.mockResolvedValue([parcel]);
    repositories.findParcelByDagNumber.mockResolvedValue(parcel);
    repositories.findParcelById.mockResolvedValue(parcel);
    repositories.findOwnersByIds.mockResolvedValue(owners);
  });

  it.each([
    "/api/parcels",
    "/api/parcels/search?dag=14",
    `/api/parcels/${parcelId.toString()}`,
  ])("requires authentication for %s", async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns map items with current owner names", async () => {
    const response = await request(app)
      .get("/api/parcels")
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        {
          id: parcelId.toString(),
          dagNumber: "14",
          landType: "RESIDENTIAL",
          polygon: parcel.polygon,
          status: "ACTIVE",
          disputeFlag: false,
          ownerName: "Fictional Current Owner",
        },
      ],
    });
  });

  it("searches by dag and returns owner, area, and dispute details", async () => {
    const response = await request(app)
      .get("/api/parcels/search?dag=14")
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(200);
    expect(repositories.findParcelByDagNumber).toHaveBeenCalledWith("14");
    expect(response.body.data).toMatchObject({
      id: parcelId.toString(),
      dagNumber: "14",
      recordedAreaDecimal: 100,
      computedAreaDecimal: 200 * env.AREA_SCALE,
      currentOwner: {
        id: currentOwnerId.toString(),
        name: "Fictional Current Owner",
      },
      khatianOwner: {
        id: khatianOwnerId.toString(),
        name: "Fictional Khatian Owner",
      },
      disputeFlag: false,
      disputeReason: null,
    });
  });

  it("returns parcel detail by id", async () => {
    const response = await request(app)
      .get(`/api/parcels/${parcelId.toString()}`)
      .set("Cookie", sessionCookie());

    expect(response.status).toBe(200);
    expect(repositories.findParcelById).toHaveBeenCalledWith(parcelId.toString());
    expect(response.body.data.dagNumber).toBe("14");
  });

  it("returns 404 when a dag or parcel does not exist", async () => {
    repositories.findParcelByDagNumber.mockResolvedValue(null);
    const missingDag = await request(app)
      .get("/api/parcels/search?dag=999")
      .set("Cookie", sessionCookie());

    repositories.findParcelById.mockResolvedValue(null);
    const missingParcel = await request(app)
      .get(`/api/parcels/${parcelId.toString()}`)
      .set("Cookie", sessionCookie());

    expect(missingDag.status).toBe(404);
    expect(missingParcel.status).toBe(404);
  });

  it("rejects malformed dag search and parcel ids", async () => {
    const malformedDag = await request(app)
      .get("/api/parcels/search?dag=")
      .set("Cookie", sessionCookie());
    const malformedId = await request(app)
      .get("/api/parcels/not-an-object-id")
      .set("Cookie", sessionCookie());

    expect(malformedDag.status).toBe(400);
    expect(malformedId.status).toBe(400);
  });
});
