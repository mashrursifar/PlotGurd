import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { getHealth } from "../lib/api-client";

export default function PlaceholderPage() {
  const location = useLocation();
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: false,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-6">
      <p className="text-sm font-semibold text-muted-foreground">PlotGuard</p>
      {isForbiddenRedirect(location.state) && (
        <p className="text-sm text-destructive" role="alert">
          Authority access is restricted to authority accounts.
        </p>
      )}
      <h1 className="font-heading text-3xl font-bold">Welcome to PlotGuard</h1>
      <p className="text-muted-foreground">
        Your account is ready. Parcel browsing will be available soon.
      </p>
      <section
        aria-live="polite"
        className="rounded-lg border border-border bg-card p-4 shadow-card"
      >
        {healthQuery.isPending && <p>Checking API health…</p>}
        {healthQuery.isError && (
          <p role="alert">API health check failed: {healthQuery.error.message}</p>
        )}
        {healthQuery.data && (
          <p>
            API: {healthQuery.data.status}; database:{" "}
            {healthQuery.data.database}
          </p>
        )}
      </section>
    </main>
  );
}

function isForbiddenRedirect(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    "forbidden" in state &&
    state.forbidden === true
  );
}
