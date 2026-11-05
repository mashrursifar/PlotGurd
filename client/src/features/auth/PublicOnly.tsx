import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function PublicOnly({ children }: PropsWithChildren) {
  const auth = useAuth();

  if (auth.isLoading) {
    return <p className="p-6 text-muted-foreground">Checking your session…</p>;
  }
  if (auth.error) {
    return (
      <>
        <div className="mx-auto max-w-3xl px-6 pt-4">
          <p className="text-sm text-destructive" role="alert">
            Session check unavailable. You can still log in or create an
            account.
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={auth.retry}
            type="button"
          >
            Retry session check
          </button>
        </div>
        {children}
      </>
    );
  }
  if (auth.user) return <Navigate to="/map" replace />;

  return children;
}
