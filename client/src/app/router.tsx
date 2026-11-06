import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthorityPage } from "../features/auth/AuthorityPage";
import { AuthenticatedLayout } from "../features/auth/AuthenticatedLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { PublicOnly } from "../features/auth/PublicOnly";
import { RequireAuth } from "../features/auth/RequireAuth";
import { RequireAuthority } from "../features/auth/RequireAuthority";
import { SignupPage } from "../features/auth/SignupPage";

const MapPage = lazy(() =>
  import("../features/map/MapPage").then(({ MapPage: mapPage }) => ({
    default: mapPage,
  })),
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: "/signup",
    element: (
      <PublicOnly>
        <SignupPage />
      </PublicOnly>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AuthenticatedLayout />,
        children: [
          {
            path: "/map",
            element: (
              <Suspense
                fallback={
                  <main
                    aria-label="Loading parcel map"
                    className="flex h-[calc(100dvh-3.5rem)] min-h-96 items-center justify-center bg-map-background"
                  >
                    <span className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                  </main>
                }
              >
                <MapPage />
              </Suspense>
            ),
          },
          {
            path: "/authority",
            element: <RequireAuthority />,
            children: [{ index: true, element: <AuthorityPage /> }],
          },
        ],
      },
      { path: "/", element: <Navigate to="/map" replace /> },
    ],
  },
  {
    path: "*",
    element: (
      <main className="p-6">
        <p role="alert">Page not found.</p>
      </main>
    ),
  },
]);
