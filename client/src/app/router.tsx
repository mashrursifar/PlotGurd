import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthorityPage } from "../features/auth/AuthorityPage";
import { AuthenticatedLayout } from "../features/auth/AuthenticatedLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { PublicOnly } from "../features/auth/PublicOnly";
import { RequireAuth } from "../features/auth/RequireAuth";
import { RequireAuthority } from "../features/auth/RequireAuthority";
import { SignupPage } from "../features/auth/SignupPage";
import PlaceholderPage from "../pages/PlaceholderPage";

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
          { path: "/map", element: <PlaceholderPage /> },
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
