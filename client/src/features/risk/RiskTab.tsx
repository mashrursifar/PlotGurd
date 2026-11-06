import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, getLatestParcelRiskAssessment, runParcelRiskAssessment } from "../../lib/api-client";
import { RiskReportView } from "./RiskReport";

interface RiskTabProps {
  parcelId: string;
}

export function RiskTab({ parcelId }: RiskTabProps) {
  const queryClient = useQueryClient();
  const assessmentQuery = useQuery({
    queryKey: ["parcel-risk", parcelId],
    queryFn: () => getLatestParcelRiskAssessment(parcelId),
    retry: false,
  });
  const assessmentMutation = useMutation({
    mutationFn: () => runParcelRiskAssessment(parcelId),
    onSuccess: async (report) => {
      queryClient.setQueryData(["parcel-risk", parcelId], report);
      await queryClient.invalidateQueries({ queryKey: ["risk-assessments", "mine"] });
    },
  });
  const hasNoAssessment =
    assessmentQuery.error instanceof ApiError &&
    assessmentQuery.error.status === 404;

  return (
    <section aria-label="Parcel risk assessment" className="space-y-4">
      <button
        className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        disabled={assessmentMutation.isPending}
        onClick={() => assessmentMutation.mutate()}
        type="button"
      >
        {assessmentMutation.isPending
          ? "Assessing…"
          : assessmentQuery.data
            ? "Run again"
            : "Run risk assessment"}
      </button>

      {assessmentMutation.isError && (
        <p aria-live="polite" className="text-sm text-destructive" role="alert">
          {assessmentMutation.error.message}
        </p>
      )}

      {assessmentQuery.isPending && (
        <div aria-label="Loading risk assessment" className="space-y-3">
          <div className="mx-auto h-28 w-48 animate-pulse rounded-t-full bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      )}

      {assessmentQuery.isError && !hasNoAssessment && (
        <div aria-live="polite" role="alert">
          <p className="text-sm text-destructive">
            {assessmentQuery.error.message}
          </p>
          <button
            className="mt-2 rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
            onClick={() => void assessmentQuery.refetch()}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {hasNoAssessment && !assessmentMutation.isSuccess && (
        <p className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          No risk assessment yet. Run one to see the score and its reasons.
        </p>
      )}

      {assessmentQuery.data && (
        <RiskReportView report={assessmentQuery.data} />
      )}
      <p className="text-xs text-muted-foreground">
        Prototype on fictional data. Not legal advice.
      </p>
    </section>
  );
}
