import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  recordParcelTransaction,
  type OwnerItem,
  type ParcelDetail,
  type TransactionType,
} from "../../lib/api-client";

const TRANSACTION_TYPES: TransactionType[] = [
  "SALE",
  "INHERITANCE",
  "GIFT",
  "MUTATION",
  "CORRECTION",
];
const fieldClassName =
  "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function currentLocalDateTime(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function TransactionForm({
  parcel,
  owners,
  onRecorded,
}: {
  parcel: ParcelDetail;
  owners: readonly OwnerItem[];
  onRecorded: () => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<TransactionType>("SALE");
  const [toOwnerId, setToOwnerId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(currentLocalDateTime);
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      recordParcelTransaction(parcel.id, {
        type,
        fromOwnerId:
          type === "SALE" || type === "INHERITANCE" || type === "GIFT"
            ? parcel.currentOwner.id
            : null,
        toOwnerId: type === "MUTATION" ? parcel.currentOwner.id : toOwnerId,
        effectiveDate: new Date(effectiveDate).toISOString(),
        note: note.trim() || null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["parcels"] }),
        queryClient.invalidateQueries({ queryKey: ["parcel", parcel.id] }),
        queryClient.invalidateQueries({
          queryKey: ["parcel-history", parcel.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["parcel-history-verification", parcel.id],
        }),
      ]);
      setToOwnerId("");
      setNote("");
      onRecorded();
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    mutation.mutate();
  }

  const requiresTargetOwner = type !== "MUTATION";
  const targetOwners =
    type === "CORRECTION"
      ? owners
      : owners.filter((owner) => owner.id !== parcel.currentOwner.id);

  return (
    <form
      className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card"
      onSubmit={handleSubmit}
    >
      <h2 className="font-heading text-lg font-semibold">Record transaction</h2>
      <p className="text-sm text-muted-foreground">
        Current owner: <span className="font-semibold">{parcel.currentOwner.name}</span>
      </p>
      <label className="block text-sm font-medium">
        Transaction type
        <select
          className={fieldClassName}
          onChange={(event) =>
            setType(event.target.value as TransactionType)
          }
          value={type}
        >
          {TRANSACTION_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {requiresTargetOwner ? (
        <label className="block text-sm font-medium">
          New owner
          <select
            className={fieldClassName}
            onChange={(event) => setToOwnerId(event.target.value)}
            required
            value={toOwnerId}
          >
            <option value="">Select an owner</option>
            {targetOwners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          A mutation updates the khatian owner to the current parcel owner.
        </p>
      )}
      <label className="block text-sm font-medium">
        Effective date
        <input
          className={fieldClassName}
          onChange={(event) => setEffectiveDate(event.target.value)}
          required
          type="datetime-local"
          value={effectiveDate}
        />
      </label>
      <label className="block text-sm font-medium">
        Note{type === "CORRECTION" ? " (required for correction)" : ""}
        <textarea
          className={`${fieldClassName} min-h-20`}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
          required={type === "CORRECTION"}
          value={note}
        />
      </label>
      {mutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutation.error.message}
        </p>
      )}
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        disabled={mutation.isPending || (requiresTargetOwner && targetOwners.length === 0)}
        type="submit"
      >
        {mutation.isPending ? "Recording…" : "Record transaction"}
      </button>
    </form>
  );
}
