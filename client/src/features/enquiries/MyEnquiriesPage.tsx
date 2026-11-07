import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getMyEnquiries } from "../../lib/api-client";

function formatDate(value: string | null): string {
  if (!value) {
    return "Awaiting a reply";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: "OPEN" | "ANSWERED" | "CLOSED" }) {
  const tone =
    status === "OPEN"
      ? "bg-blue-100 text-blue-900"
      : status === "ANSWERED"
        ? "bg-amber-100 text-amber-900"
        : "bg-emerald-100 text-emerald-900";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

export function MyEnquiriesPage() {
  const enquiriesQuery = useQuery({
    queryKey: ["enquiries", "mine"],
    queryFn: getMyEnquiries,
  });

  return (
    <main className="mx-auto min-h-[calc(100dvh-3.5rem)] max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">My enquiries</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions you submitted about parcels and their replies.
        </p>
      </header>

      {enquiriesQuery.isPending && (
        <div aria-label="Loading enquiries" className="space-y-3">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </div>
      )}

      {enquiriesQuery.isError && (
        <div aria-live="polite" role="alert">
          <p className="text-sm text-destructive">{enquiriesQuery.error.message}</p>
          <button
            className="mt-3 rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
            onClick={() => void enquiriesQuery.refetch()}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {enquiriesQuery.data && enquiriesQuery.data.length === 0 && (
        <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
          You have not submitted any enquiries yet.
        </p>
      )}

      {enquiriesQuery.data && enquiriesQuery.data.length > 0 && (
        <ul aria-label="My enquiries" className="space-y-4">
          {enquiriesQuery.data.map((enquiry) => (
            <li key={enquiry.id}>
              <article className="rounded-lg border border-border bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Parcel <span className="font-mono font-semibold">{enquiry.parcelId}</span>
                    </p>
                  </div>
                  <StatusBadge status={enquiry.status} />
                </div>

                <p className="mt-4 text-base font-medium">{enquiry.question}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Submitted {formatDate(enquiry.createdAt)}
                </p>

                <div className="mt-4 rounded-md border border-border bg-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Reply
                  </p>
                  <p className="mt-2 text-sm">
                    {enquiry.reply ? enquiry.reply : "No reply yet."}
                  </p>
                  {enquiry.repliedAt && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Replied {formatDate(enquiry.repliedAt)}
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <Link
                    className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
                    to="/map"
                  >
                    View parcel
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
