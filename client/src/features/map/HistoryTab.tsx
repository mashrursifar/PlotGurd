import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import {
  getParcelHistory,
  verifyParcelHistory,
  type LedgerEntryType,
  type ParcelHistoryEntry,
} from "../../lib/api-client";

interface HistoryTabProps {
  parcelId: string;
}

const ENTRY_LABELS: Record<LedgerEntryType, string> = {
  REGISTRATION: "Registration",
  SALE: "Sale",
  INHERITANCE: "Inheritance",
  GIFT: "Gift",
  MUTATION: "Mutation",
  CORRECTION: "Correction",
};

const ENTRY_MARKER_CLASSES: Record<LedgerEntryType, string> = {
  REGISTRATION: "bg-primary",
  SALE: "bg-land-commercial",
  INHERITANCE: "bg-land-residential",
  GIFT: "bg-land-wetland",
  MUTATION: "bg-land-government",
  CORRECTION: "border-2 border-destructive bg-card",
};

function formatEffectiveDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function HistoryEntryCard({
  entry,
  isBroken,
}: {
  entry: ParcelHistoryEntry;
  isBroken: boolean;
}) {
  return (
    <li className="relative pl-8">
      <span
        aria-hidden="true"
        className={`absolute left-[-6px] top-4 h-3 w-3 rounded-full ${ENTRY_MARKER_CLASSES[entry.type]}`}
      />
      <article
        className={`rounded-lg border p-3 ${
          isBroken
            ? "border-destructive bg-[var(--integrity-invalid-soft)]"
            : "border-border bg-card"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
            {ENTRY_LABELS[entry.type]}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            Entry {entry.seq}
          </span>
        </div>
        <p className="mt-3 text-sm font-semibold">
          {entry.fromOwner ?? "No previous owner"}{" "}
          <span aria-hidden="true">→</span> {entry.toOwner}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatEffectiveDate(entry.effectiveDate)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Recorded by {entry.performedBy}
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Hash:{" "}
          <span title={entry.entryHash}>
            {entry.entryHash.slice(0, 8)}…{entry.entryHash.slice(-6)}
          </span>
        </p>
        {entry.note && (
          <p className="mt-2 border-t border-border pt-2 text-sm">
            {entry.note}
          </p>
        )}
      </article>
    </li>
  );
}

export function HistoryTab({ parcelId }: HistoryTabProps) {
  const historyQuery = useQuery({
    queryKey: ["parcel-history", parcelId],
    queryFn: () => getParcelHistory(parcelId),
    retry: false,
  });
  const verificationQuery = useQuery({
    queryKey: ["parcel-history-verification", parcelId],
    queryFn: () => verifyParcelHistory(parcelId),
    enabled: false,
    retry: false,
  });

  function verifyIntegrity(): void {
    void verificationQuery.refetch();
  }

  return (
    <section aria-label="Parcel history" className="space-y-4">
      <button
        className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        disabled={verificationQuery.isFetching}
        onClick={verifyIntegrity}
        type="button"
      >
        {verificationQuery.isFetching ? "Verifying…" : "Verify integrity"}
      </button>

      {verificationQuery.data && (
        <div
          aria-live="polite"
          className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
            verificationQuery.data.valid
              ? "border-[var(--integrity-valid)] bg-[var(--integrity-valid-soft)] text-[var(--integrity-valid-text)]"
              : "border-destructive bg-[var(--integrity-invalid-soft)] text-[var(--integrity-invalid-text)]"
          }`}
          role={verificationQuery.data.valid ? "status" : "alert"}
        >
          {verificationQuery.data.valid ? (
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={18}
            />
          ) : (
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={18}
            />
          )}
          <p>
            {verificationQuery.data.valid
              ? `History verified: ${verificationQuery.data.entriesChecked} entries, no changes detected.`
              : `History altered: entry ${verificationQuery.data.firstBrokenSeq ?? "unknown"} failed integrity verification.${verificationQuery.data.reason ? ` ${verificationQuery.data.reason}` : ""}`}
          </p>
        </div>
      )}

      {verificationQuery.isError && (
        <div
          aria-live="polite"
          className="rounded-lg border border-destructive bg-[var(--integrity-invalid-soft)] p-3 text-sm text-[var(--integrity-invalid-text)]"
          role="alert"
        >
          <p>{verificationQuery.error.message}</p>
          <button
            className="mt-2 font-semibold underline"
            onClick={verifyIntegrity}
            type="button"
          >
            Try verification again
          </button>
        </div>
      )}

      {historyQuery.isPending && (
        <div aria-label="Loading parcel history" className="space-y-3">
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        </div>
      )}

      {historyQuery.isError && (
        <div aria-live="polite" role="alert">
          <p className="text-sm text-destructive">
            {historyQuery.error.message}
          </p>
          <button
            className="mt-2 rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
            onClick={() => void historyQuery.refetch()}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {historyQuery.data?.length === 0 && (
        <p className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          No history entries.
        </p>
      )}

      {historyQuery.data && historyQuery.data.length > 0 && (
        <ol className="relative space-y-3 border-l-2 border-border pb-1">
          {historyQuery.data.map((entry) => (
            <HistoryEntryCard
              entry={entry}
              isBroken={
                !verificationQuery.data?.valid &&
                verificationQuery.data?.firstBrokenSeq === entry.seq
              }
              key={entry.seq}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
