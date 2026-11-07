import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "./useAuth";

export function AuthenticatedLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");
  const initials =
    auth.user?.name
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "";

  async function handleLogout(): Promise<void> {
    setLogoutError("");
    try {
      await auth.logout();
      navigate("/login", { replace: true });
    } catch (error: unknown) {
      setLogoutError(
        error instanceof Error ? error.message : "Unable to log out.",
      );
    }
  }

  return (
    <>
      <header className="relative z-[1000] bg-primary text-primary-foreground">
        <nav className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <Link className="font-heading text-lg font-bold" to="/">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.75} />
              PlotGuard
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <NavLink
              className={({ isActive }) =>
                `border-b-2 py-4 ${isActive ? "border-accent" : "border-transparent"}`
              }
              to="/map"
            >
              Map
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `border-b-2 py-4 ${isActive ? "border-accent" : "border-transparent"}`
              }
              to="/risk/mine"
            >
              My assessments
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `border-b-2 py-4 ${isActive ? "border-accent" : "border-transparent"}`
              }
              to="/enquiries/mine"
            >
              My enquiries
            </NavLink>
            {auth.isAuthority && (
              <NavLink
                className={({ isActive }) =>
                  `border-b-2 py-4 ${isActive ? "border-accent" : "border-transparent"}`
                }
                to="/authority"
              >
                Authority
              </NavLink>
            )}
            {auth.isAuthority && (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                Authority
              </span>
            )}
            <details className="relative">
              <summary
                aria-label="Open account menu"
                className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
              >
                {initials}
              </summary>
              <div className="absolute right-0 top-full z-10 mt-2 w-52 rounded-lg border border-border bg-card p-3 text-foreground shadow-panel">
                <p className="mb-3 truncate text-sm font-semibold">
                  {auth.user?.name}
                </p>
                <button
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-muted"
                  onClick={handleLogout}
                  type="button"
                >
                  Log out
                </button>
              </div>
            </details>
          </div>
        </nav>
      </header>
      {logoutError && (
        <p
          className="bg-destructive px-6 py-2 text-center text-sm text-primary-foreground"
          role="alert"
        >
          {logoutError}
        </p>
      )}
      <Outlet />
    </>
  );
}
