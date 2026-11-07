import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositories = vi.hoisted(() => ({
  findUserById: vi.fn(),
  listEnquiriesForUser: vi.fn(),
  findEnquiryById: vi.fn(),
  updateEnquiryById: vi.fn(),
  createEnquiry: vi.fn(),
  listEnquiriesPage: vi.fn(),
  findParcelById: vi.fn(),
}));

vi.mock("../src/modules/users/user.repository.js", () => ({
  findUserById: repositories.findUserById,
}));
vi.mock("../src/modules/enquiries/enquiry.repository.js", () => ({
  createEnquiry: repositories.createEnquiry,
  findEnquiryById: repositories.findEnquiryById,
  listEnquiriesForUser: repositories.listEnquiriesForUser,
  listEnquiriesPage: repositories.listEnquiriesPage,
  updateEnquiryById: repositories.updateEnquiryById,
}));
vi.mock("../src/modules/parcels/parcel.repository.js", () => ({
  findParcelById: repositories.findParcelById,
}));

import { env } from "../src/config/env.js";
import { app } from "../src/app.js";
import { AUTH_COOKIE_NAME } from "../src/modules/auth/auth.controller.js";

function sessionCookie(userId: Types.ObjectId): string {
  const token = jwt.sign({ sub: userId.toString() }, env.JWT_SECRET);
  return `${AUTH_COOKIE_NAME}=${token}`;
}

describe("enquiry workflow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    repositories.findUserById.mockImplementation(async (id: string) => {
      const userId = new Types.ObjectId(id);
      const isAuthority = userId.toHexString() === "6500000000000000000000a6";
      return {
        _id: userId,
        name: isAuthority ? "Authority" : "Alice",
        email: isAuthority ? "authority@example.test" : "alice@example.test",
        role: isAuthority ? "authority" : "user",
      };
    });
  });

  it("returns only the signed-in user's own enquiries", async () => {
    const userId = new Types.ObjectId("6500000000000000000000a3");
    const otherUserId = new Types.ObjectId("6500000000000000000000a4");
    repositories.listEnquiriesForUser.mockImplementation(async (id: string) => {
      if (id !== userId.toString()) {
        return [];
      }

      return [
        {
          _id: new Types.ObjectId("660000000000000000000010"),
          parcelId: new Types.ObjectId("660000000000000000000014"),
          userId,
          question: "This is my question.",
          status: "OPEN",
          reply: null,
          repliedBy: null,
          repliedAt: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ];
    });

    const response = await request(app)
      .get("/api/enquiries/mine")
      .set("Cookie", sessionCookie(userId));

    expect(response.status).toBe(200);
    expect(repositories.listEnquiriesForUser).toHaveBeenCalledWith(userId.toString());
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      userId: userId.toString(),
      question: "This is my question.",
      status: "OPEN",
    });
  });

  it("requires authentication for enquiry routes", async () => {
    const response = await request(app).get("/api/enquiries/mine");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("allows authorities to reply to and close enquiries", async () => {
    const userId = new Types.ObjectId("6500000000000000000000a3");
    const authorityId = new Types.ObjectId("6500000000000000000000a6");
    const enquiryId = new Types.ObjectId("660000000000000000000012");

    repositories.findUserById.mockImplementation(async (id: string) => ({
      _id: new Types.ObjectId(id),
      name: id === authorityId.toString() ? "Authority" : "Alice",
      email: id === authorityId.toString() ? "authority@example.test" : "alice@example.test",
      role: id === authorityId.toString() ? "authority" : "user",
    }));
    repositories.findEnquiryById.mockResolvedValue({
      _id: enquiryId,
      parcelId: new Types.ObjectId("660000000000000000000014"),
      userId,
      question: "Can you explain this plot?",
      status: "OPEN",
      reply: null,
      repliedBy: null,
      repliedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    repositories.updateEnquiryById.mockResolvedValue({
      _id: enquiryId,
      parcelId: new Types.ObjectId("660000000000000000000014"),
      userId,
      question: "Can you explain this plot?",
      status: "ANSWERED",
      reply: "The record has been reviewed.",
      repliedBy: authorityId,
      repliedAt: new Date("2026-01-02T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const replyResponse = await request(app)
      .patch(`/api/enquiries/${enquiryId.toString()}/reply`)
      .set("Cookie", sessionCookie(authorityId))
      .send({ reply: "The record has been reviewed." });

    expect(replyResponse.status).toBe(200);
    expect(replyResponse.body.data.status).toBe("ANSWERED");

    repositories.findEnquiryById.mockResolvedValue({
      _id: enquiryId,
      parcelId: new Types.ObjectId("660000000000000000000014"),
      userId,
      question: "Can you explain this plot?",
      status: "ANSWERED",
      reply: "The record has been reviewed.",
      repliedBy: authorityId,
      repliedAt: new Date("2026-01-02T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    repositories.updateEnquiryById.mockResolvedValue({
      _id: enquiryId,
      parcelId: new Types.ObjectId("660000000000000000000014"),
      userId,
      question: "Can you explain this plot?",
      status: "CLOSED",
      reply: "The record has been reviewed.",
      repliedBy: authorityId,
      repliedAt: new Date("2026-01-02T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const closeResponse = await request(app)
      .patch(`/api/enquiries/${enquiryId.toString()}/close`)
      .set("Cookie", sessionCookie(authorityId));

    expect(closeResponse.status).toBe(200);
    expect(closeResponse.body.data.status).toBe("CLOSED");
  });
});
