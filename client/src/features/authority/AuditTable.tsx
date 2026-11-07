import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../../lib/api-client";

const fieldClassName =
  "rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AuditTable() {
  const [page, setPage] = useState(1);
  const [actionInput, setActionInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [filters, setFilters] = useState<{ action?: string; target?: string }>(
    {},
  );
  const query = useQuery({
    queryKey: ["audit", page, filters.action, filters.target],
    queryFn: () => getAuditLogs(page, 20, filters),
  });

  return (
    <section className="space-y-4">
      <form
        className="flex flex-wrap gap-3 rounded-lg border border-border bg-card p-4 shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setFilters({
            action: actionInput.trim() || undefined,
            target: targetInput.trim() || undefined,
          });
        }}
      >
        <label className="min-w-48 flex-1 text-sm font-medium">
          Action
          <input
            className={`${fieldClassName} mt-1 w-full`}
            onChange={(event) => setActionInput(event.target.value)}
            placeholder="e.g. LEDGER_APPEND"
            value={actionInput}
          />
        </label>
        <label className="min-w-48 flex-1 text-sm font-medium">
          Target type or ID
          <input
            className={`${fieldClassName} mt-1 w-full`}
            onChange={(event) => setTargetInput(event.target.value)}
            placeholder="parcel or identifier"
            value={targetInput}
          />
        </label>
        <button
          className="self-end rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          type="submit"
        >
          Apply filters
        </button>
      </form>

      {query.isPending && (
        <div aria-label="Loading audit log" className="h-28 animate-pulse rounded-lg bg-muted" />
      )}
      {query.isError && (
        <div aria-live="polite" role="alert">
          <p className="text-sm text-destructive">{query.error.message}</p>
          <button
            className="mt-3 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
            onClick={() => void query.refetch()}
            type="button"
          >
            Try again
          </button>
        </div>
      )}
      {query.data && query.data.items.length === 0 && (
        <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
          No audit entries match these filters.
        </p>
      )}
      {query.data && query.data.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold" scope="col">Date</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Action</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Actor</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Target</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Summary</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((entry) => (
                  <tr className="border-t border-border" key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono">{entry.action}</td>
                    <td className="px-4 py-3 font-mono">{entry.actorId}</td>
                    <td className="px-4 py-3">
                      <span className="block">{entry.targetType}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.targetId}
                      </span>
                    </td>
                    <td className="px-4 py-3">{entry.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {query.data.page} · {query.data.total} entries
            </p>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((current) => current - 1)}
                type="button"
              >
                Previous
              </button>
              <button
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                disabled={page * query.data.limit >= query.data.total || query.isFetching}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
