import { afterEach, describe, expect, it, vi } from "vitest";
import { getParcelHistory, verifyParcelHistory } from "../lib/api-client";

const parcelId = "660000000000000000000014";
const entryHash = "a".repeat(64);

function response(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("parcel history API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads ordered history entries and includes session cookies", async () => {
    const history = [
      {
        seq: 1,
        type: "REGISTRATION",
        fromOwner: null,
        toOwner: "Fictional Parcel Owner",
        effectiveDate: "2025-01-01T00:00:00.000Z",
        performedBy: "Fictional Authority",
        source: "LIVE",
        note: null,
        entryHash,
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(response(history));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getParcelHistory(parcelId)).resolves.toEqual(history);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/parcels/${parcelId}/history`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("rejects history entries without a valid SHA-256 hash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response([
          {
            seq: 1,
            type: "REGISTRATION",
            fromOwner: null,
            toOwner: "Fictional Parcel Owner",
            effectiveDate: "2025-01-01T00:00:00.000Z",
            performedBy: "Fictional Authority",
            source: "LIVE",
            note: null,
            entryHash: "invalid",
          },
        ]),
      ),
    );

    await expect(getParcelHistory(parcelId)).rejects.toThrow(
      "The API returned an invalid parcel history.",
    );
  });

  it("requests and validates history integrity", async () => {
    const verification = {
      valid: false,
      entriesChecked: 2,
      firstBrokenSeq: 2,
      reason: "Hash mismatch at sequence 2.",
    };
    const fetchMock = vi.fn().mockResolvedValue(response(verification));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyParcelHistory(parcelId)).resolves.toEqual(verification);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/parcels/${parcelId}/history/verify`,
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
