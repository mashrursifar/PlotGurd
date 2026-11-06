import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getMyRiskAssessments } from "../../lib/api-client";
import { RiskBandBadge } from "./RiskReport";

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MyAssessmentsPage() {
  const assessmentsQuery = useQuery({
    queryKey: ["risk-assessments", "mine"],
    queryFn: getMyRiskAssessments,
  });

  return (
    <main className="mx-auto min-h-[calc(100dvh-3.5rem)] max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">My assessments</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Risk reports you have run for parcels.
        </p>
      </header>

      {assessmentsQuery.isPending && (
        <div aria-label="Loading risk assessments" className="space-y-3">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </div>
      )}

      {assessmentsQuery.isError && (
        <div aria-live="polite" role="alert">
          <p className="text-sm text-destructive">
            {assessmentsQuery.error.message}
          </p>
          <button
            className="mt-3 rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
            onClick={() => void assessmentsQuery.refetch()}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {assessmentsQuery.data?.length === 0 && (
        <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
          You have not run any risk assessments yet. Open a parcel on the map
          and select its Risk tab to get started.
        </p>
      )}

      {assessmentsQuery.data && assessmentsQuery.data.length > 0 && (
        <ul aria-label="Past risk assessments" className="space-y-3">
          {assessmentsQuery.data.map((assessment) => (
            <li key={assessment.id}>
              <article className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-card">
                <div>
                  <h2 className="font-heading text-lg font-semibold">
                    Dag <span className="font-mono">{assessment.dagNumber}</span>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Assessed {formatGeneratedAt(assessment.generatedAt)}
                  </p>
                  <p className="mt-1 text-sm">
                    Score{" "}
                    <span className="font-heading font-bold">
                      {assessment.score}
                    </span>
                    <span className="sr-only"> out of 100</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <RiskBandBadge band={assessment.band} />
                  <Link
                    className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
                    to={`/map?dag=${encodeURIComponent(assessment.dagNumber)}`}
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
