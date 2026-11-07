import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { setParcelDispute, type ParcelDetail } from "../../lib/api-client";

const fieldClassName =
  "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function DisputeDialog({
  parcel,
  onClose,
}: {
  parcel: ParcelDetail;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState(parcel.disputeReason ?? "");
  const mutation = useMutation({
    mutationFn: (input: { disputeFlag: boolean; disputeReason: string | null }) =>
      setParcelDispute(parcel.id, input.disputeFlag, input.disputeReason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["parcels"] }),
        queryClient.invalidateQueries({ queryKey: ["parcel", parcel.id] }),
      ]);
      onClose();
    },
  });

  function handleSet(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    mutation.mutate({
      disputeFlag: true,
      disputeReason: reason.trim(),
    });
  }

  return (
    <div
      aria-label={`Dispute flag for dag ${parcel.dagNumber}`}
      aria-modal="true"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
    >
      <section className="w-full max-w-lg space-y-4 rounded-lg border border-border bg-card p-5 shadow-panel">
        <header>
          <h2 className="font-heading text-xl font-semibold">
            Dispute flag · Dag {parcel.dagNumber}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A dispute reason is included in parcel risk assessments.
          </p>
        </header>
        <form className="space-y-3" onSubmit={handleSet}>
          <label className="block text-sm font-medium">
            Reason
            <textarea
              className={`${fieldClassName} min-h-24`}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              required
              value={reason}
            />
          </label>
          {mutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              {mutation.error.message}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {parcel.disputeFlag && (
              <button
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    disputeFlag: false,
                    disputeReason: null,
                  })
                }
                type="button"
              >
                Clear dispute
              </button>
            )}
            <button
              className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? "Saving…" : "Set dispute"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
