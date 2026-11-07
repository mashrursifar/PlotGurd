import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  createParcel,
  updateParcel,
  type OwnerItem,
  type ParcelDetail,
  type ParcelLandType,
  type ParcelStatus,
} from "../../lib/api-client";

const LAND_TYPES: ParcelLandType[] = [
  "AGRICULTURAL",
  "RESIDENTIAL",
  "COMMERCIAL",
  "WETLAND",
  "GOVERNMENT",
];
const STATUSES: ParcelStatus[] = ["ACTIVE", "UNDER_REVIEW"];
const fieldClassName =
  "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function polygonText(polygon: [number, number][]): string {
  return polygon.map(([x, y]) => `${x},${y}`).join("\n");
}

function parsePolygon(value: string): [number, number][] {
  return value.split("\n").map((line) => {
    const parts = line.split(",");
    if (
      parts.length !== 2 ||
      parts.some((coordinate) => coordinate.trim().length === 0)
    ) {
      throw new Error("Enter one finite x,y coordinate pair per line.");
    }
    const coordinates = parts.map((coordinate) => Number(coordinate.trim()));
    if (
      coordinates.some((coordinate) => !Number.isFinite(coordinate))
    ) {
      throw new Error("Enter one finite x,y coordinate pair per line.");
    }
    return [coordinates[0], coordinates[1]];
  });
}

export function ParcelForm({
  parcel,
  owners,
  onSaved,
}: {
  parcel: ParcelDetail | null;
  owners: readonly OwnerItem[];
  onSaved: (parcel: ParcelDetail) => void;
}) {
  const queryClient = useQueryClient();
  const [mouza, setMouza] = useState(parcel?.mouza ?? "Kalpanapur");
  const [dagNumber, setDagNumber] = useState(parcel?.dagNumber ?? "");
  const [khatianNumber, setKhatianNumber] = useState(parcel?.khatianNumber ?? "");
  const [landType, setLandType] = useState<ParcelLandType>(
    parcel?.landType ?? "AGRICULTURAL",
  );
  const [recordedAreaDecimal, setRecordedAreaDecimal] = useState(
    String(parcel?.recordedAreaDecimal ?? ""),
  );
  const [polygon, setPolygon] = useState(
    parcel ? polygonText(parcel.polygon) : "",
  );
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState<ParcelStatus>(parcel?.status ?? "ACTIVE");
  const [formError, setFormError] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      const parsedPolygon = parsePolygon(polygon);
      if (parsedPolygon.length < 3) {
        throw new Error("A parcel polygon needs at least three points.");
      }
      if (parcel) {
        return updateParcel(parcel.id, {
          khatianNumber,
          landType,
          recordedAreaDecimal: Number(recordedAreaDecimal),
          polygon: parsedPolygon,
          status,
        });
      }
      return createParcel({
        mouza,
        dagNumber,
        khatianNumber,
        landType,
        recordedAreaDecimal: Number(recordedAreaDecimal),
        polygon: parsedPolygon,
        currentOwnerId: ownerId,
      });
    },
    onSuccess: async (updatedParcel) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["parcels"] }),
        queryClient.invalidateQueries({ queryKey: ["parcel", updatedParcel.id] }),
      ]);
      onSaved(updatedParcel);
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError("");
    try {
      await mutation.mutateAsync();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith("Enter one finite")) {
        setFormError(error.message);
      }
    }
  }

  return (
    <form
      className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <h2 className="font-heading text-lg font-semibold">
        {parcel ? "Edit parcel" : "Register parcel"}
      </h2>
      {!parcel && (
        <>
          <label className="block text-sm font-medium">
            Mouza
            <input
              className={fieldClassName}
              maxLength={120}
              onChange={(event) => setMouza(event.target.value)}
              required
              value={mouza}
            />
          </label>
          <label className="block text-sm font-medium">
            Dag number
            <input
              className={fieldClassName}
              maxLength={80}
              onChange={(event) => setDagNumber(event.target.value)}
              required
              value={dagNumber}
            />
          </label>
        </>
      )}
      <label className="block text-sm font-medium">
        Khatian number
        <input
          className={fieldClassName}
          maxLength={100}
          onChange={(event) => setKhatianNumber(event.target.value)}
          required
          value={khatianNumber}
        />
      </label>
      <label className="block text-sm font-medium">
        Land type
        <select
          className={fieldClassName}
          onChange={(event) => setLandType(event.target.value as ParcelLandType)}
          value={landType}
        >
          {LAND_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Recorded area (decimals)
        <input
          className={fieldClassName}
          min="0"
          onChange={(event) => setRecordedAreaDecimal(event.target.value)}
          required
          step="any"
          type="number"
          value={recordedAreaDecimal}
        />
      </label>
      <label className="block text-sm font-medium">
        Polygon points (x,y per line; map bounds x 0–1000, y 0–700)
        <textarea
          className={`${fieldClassName} min-h-24 font-mono`}
          onChange={(event) => setPolygon(event.target.value)}
          required
          value={polygon}
        />
      </label>
      {parcel ? (
        <label className="block text-sm font-medium">
          Status
          <select
            className={fieldClassName}
            onChange={(event) => setStatus(event.target.value as ParcelStatus)}
            value={status}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="block text-sm font-medium">
          Initial owner
          <select
            className={fieldClassName}
            onChange={(event) => setOwnerId(event.target.value)}
            required
            value={ownerId}
          >
            <option value="">Select an owner</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {(formError || mutation.isError) && (
        <p className="text-sm text-destructive" role="alert">
          {formError || mutation.error?.message || "Unable to save parcel."}
        </p>
      )}
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        disabled={mutation.isPending || (!parcel && owners.length === 0)}
        type="submit"
      >
        {mutation.isPending ? "Saving…" : parcel ? "Save parcel" : "Register parcel"}
      </button>
    </form>
  );
}
