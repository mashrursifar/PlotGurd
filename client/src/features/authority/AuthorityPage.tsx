import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getParcelDetail,
  getParcels,
  getOwners,
  type ParcelMapItem,
} from "../../lib/api-client";
import { DisputeDialog } from "./DisputeDialog";
import { OwnerForm } from "./OwnerForm";
import { ParcelForm } from "./ParcelForm";
import { TransactionForm } from "./TransactionForm";

function ParcelList({
  parcels,
  selectedId,
  onSelect,
}: {
  parcels: readonly ParcelMapItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="max-h-[32rem] overflow-auto">
      <table aria-label="Parcels" className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold" scope="col">Dag</th>
            <th className="px-3 py-2 font-semibold" scope="col">Land type</th>
            <th className="px-3 py-2 font-semibold" scope="col">Owner</th>
          </tr>
        </thead>
        <tbody>
          {parcels.map((parcel) => (
            <tr
              aria-current={parcel.id === selectedId ? "true" : undefined}
              className={`border-t border-border ${
                parcel.id === selectedId ? "bg-muted" : ""
              }`}
              key={parcel.id}
            >
              <td className="px-3 py-2">
                <button
                  className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onSelect(parcel.id)}
                  type="button"
                >
                  {parcel.dagNumber}
                </button>
                {parcel.disputeFlag && (
                  <span className="ml-1 rounded-full border border-border px-1.5 py-0.5 text-xs">
                    Disputed
                  </span>
                )}
              </td>
              <td className="px-3 py-2">{parcel.landType.replace("_", " ")}</td>
              <td className="max-w-40 truncate px-3 py-2">{parcel.ownerName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuthorityPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [notice, setNotice] = useState("");
  const parcelsQuery = useQuery({
    queryKey: ["parcels"],
    queryFn: getParcels,
  });
  const ownersQuery = useQuery({
    queryKey: ["owners"],
    queryFn: () => getOwners(),
  });
  const detailQuery = useQuery({
    queryKey: ["parcel", selectedId],
    queryFn: () => {
      if (selectedId === null) {
        throw new Error("Select a parcel to continue.");
      }
      return getParcelDetail(selectedId);
    },
    enabled: selectedId !== null,
  });

  if (parcelsQuery.isPending || ownersQuery.isPending) {
    return (
      <main
        aria-label="Loading authority tools"
        className="mx-auto min-h-[calc(100dvh-3.5rem)] max-w-6xl space-y-4 p-6"
      >
        <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </main>
    );
  }

  if (parcelsQuery.isError || ownersQuery.isError) {
    const errorMessage =
      parcelsQuery.error?.message ??
      ownersQuery.error?.message ??
      "Unable to load authority data.";
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="font-heading text-2xl font-bold">Authority tools</h1>
        <p className="mt-3 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
        <button
          className="mt-3 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          onClick={() => {
            void parcelsQuery.refetch();
            void ownersQuery.refetch();
          }}
          type="button"
        >
          Try again
        </button>
      </main>
    );
  }

  const parcels = parcelsQuery.data;
  const owners = ownersQuery.data;

  return (
    <main className="mx-auto min-h-[calc(100dvh-3.5rem)] max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">Authority tools</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update fictional parcel records, record ownership history, and review audit actions.
        </p>
      </header>
      {notice && (
        <p className="rounded-md border border-border bg-card p-3 text-sm" role="status">
          {notice}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h2 className="mb-3 font-heading text-lg font-semibold">Parcels</h2>
            {parcels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No parcels yet. Register one below.
              </p>
            ) : (
              <ParcelList
                onSelect={(id) => {
                  setSelectedId(id);
                  setNotice("");
                }}
                parcels={parcels}
                selectedId={selectedId}
              />
            )}
          </section>
          <details className="rounded-lg border border-border bg-card p-4 shadow-card">
            <summary className="cursor-pointer font-heading text-lg font-semibold">
              Add an owner
            </summary>
            <div className="mt-4">
              <OwnerForm />
            </div>
          </details>
          <details className="rounded-lg border border-border bg-card p-4 shadow-card">
            <summary className="cursor-pointer font-heading text-lg font-semibold">
              Register a parcel
            </summary>
            <div className="mt-4">
              <ParcelForm
                key="new-parcel"
                onSaved={(parcel) => {
                  setSelectedId(parcel.id);
                  setNotice(`Registered dag ${parcel.dagNumber} with a registration ledger entry.`);
                }}
                owners={owners}
                parcel={null}
              />
            </div>
          </details>
        </aside>

        <section className="space-y-4">
          {!selectedId && parcels.length > 0 && (
            <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
              Select a parcel to view its authority actions.
            </p>
          )}
          {detailQuery.isPending && selectedId && (
            <div aria-label="Loading parcel details" className="h-52 animate-pulse rounded-lg bg-muted" />
          )}
          {detailQuery.isError && (
            <div role="alert">
              <p className="text-sm text-destructive">{detailQuery.error.message}</p>
              <button
                className="mt-3 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                onClick={() => void detailQuery.refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          )}
          {detailQuery.data && (
            <>
              <section className="rounded-lg border border-border bg-card p-4 shadow-card">
                <h2 className="font-heading text-xl font-semibold">
                  Dag {detailQuery.data.dagNumber} · Khatian {detailQuery.data.khatianNumber}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Current owner: {detailQuery.data.currentOwner.name}
                  {detailQuery.data.khatianOwner.id !== detailQuery.data.currentOwner.id &&
                    ` · Khatian owner: ${detailQuery.data.khatianOwner.name}`}
                </p>
                <button
                  className="mt-4 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  onClick={() => setShowDisputeDialog(true)}
                  type="button"
                >
                  {detailQuery.data.disputeFlag ? "Manage dispute flag" : "Set dispute flag"}
                </button>
              </section>
              <ParcelForm
                key={detailQuery.data.id}
                onSaved={(parcel) =>
                  setNotice(`Saved changes to dag ${parcel.dagNumber}.`)
                }
                owners={owners}
                parcel={detailQuery.data}
              />
              <TransactionForm
                key={`transaction-${detailQuery.data.id}-${detailQuery.data.currentOwner.id}`}
                onRecorded={() =>
                  setNotice(`Recorded a transaction for dag ${detailQuery.data.dagNumber}.`)
                }
                owners={owners}
                parcel={detailQuery.data}
              />
            </>
          )}
        </section>
      </div>
      {showDisputeDialog && detailQuery.data && (
        <DisputeDialog
          onClose={() => setShowDisputeDialog(false)}
          parcel={detailQuery.data}
        />
      )}
    </main>
  );
}
