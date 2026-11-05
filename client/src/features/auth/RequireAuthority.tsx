import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RequireAuthority() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <p className="p-6 text-muted-foreground">Checking your session…</p>;
  }
  if (auth.error) {
    return (
      <main className="p-6">
        <p role="alert">Unable to verify your session. Please try again.</p>
        <button className="mt-3 text-primary underline" onClick={auth.retry}>
          Retry
        </button>
      </main>
    );
  }
  if (!auth.user) return <Navigate to="/login" replace />;
  if (!auth.isAuthority) {
    return <Navigate to="/map" state={{ forbidden: true }} replace />;
  }

  return <Outlet />;
}
