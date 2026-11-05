import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <p className="p-6 text-muted-foreground">Checking your session…</p>;
  }
  if (auth.error) {
    return <Navigate to="/login" state={{ sessionCheckFailed: true }} replace />;
  }
  if (!auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
