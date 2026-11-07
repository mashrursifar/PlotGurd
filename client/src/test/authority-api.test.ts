import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOwner,
  getAuditLogs,
  recordParcelTransaction,
} from "../lib/api-client";

function response(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("authority API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an owner using the authenticated API", async () => {
    const owner = {
      id: "650000000000000000000114",
      name: "Fictional Owner",
      nationalId: "TEST-114",
      address: "Fictional address",
    };
    const fetchMock = vi.fn().mockResolvedValue(response(owner));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createOwner({
        name: owner.name,
        nationalId: owner.nationalId,
        address: owner.address,
      }),
    ).resolves.toEqual(owner);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/owners",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          name: owner.name,
          nationalId: owner.nationalId,
          address: owner.address,
        }),
      }),
    );
  });

  it("records and validates a ledger transaction response", async () => {
    const transaction = {
      seq: 2,
      type: "SALE",
      fromOwner: "Fictional Current Owner",
      toOwner: "Fictional New Owner",
      effectiveDate: "2025-02-01T00:00:00.000Z",
      performedBy: "Fictional Authority",
      source: "LIVE",
      note: null,
      entryHash: "a".repeat(64),
    };
    const fetchMock = vi.fn().mockResolvedValue(response(transaction));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      recordParcelTransaction("660000000000000000000014", {
        type: "SALE",
        fromOwnerId: "650000000000000000000114",
        toOwnerId: "650000000000000000000115",
        effectiveDate: transaction.effectiveDate,
        note: null,
      }),
    ).resolves.toEqual(transaction);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/parcels/660000000000000000000014/transactions",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("loads a paginated audit page with filters", async () => {
    const auditPage = {
      items: [],
      page: 2,
      limit: 10,
      total: 25,
    };
    const fetchMock = vi.fn().mockResolvedValue(response(auditPage));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getAuditLogs(2, 10, { action: "LEDGER_APPEND", target: "parcel" }),
    ).resolves.toEqual(auditPage);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audit?page=2&limit=10&action=LEDGER_APPEND&target=parcel",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
