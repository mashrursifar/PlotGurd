import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, type ApiErrorDetail } from "../../lib/api-client";
import { useAuth } from "./useAuth";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ApiErrorDetail[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setFieldErrors([]);
    setIsSubmitting(true);

    try {
      if (isSignup) {
        await auth.signup({ name, email, password });
      } else {
        await auth.login({ email, password });
      }
      navigate("/map", { replace: true });
    } catch (submitError: unknown) {
      if (submitError instanceof ApiError && submitError.details.length > 0) {
        const formFieldErrors = submitError.details.filter((detail) =>
          ["name", "email", "password"].includes(detail.path),
        );
        const otherErrors = submitError.details.filter(
          (detail) => !["name", "email", "password"].includes(detail.path),
        );
        setFieldErrors(formFieldErrors);
        const visibleErrors =
          formFieldErrors.length === 0
            ? submitError.details
            : otherErrors;
        if (visibleErrors.length > 0) {
          setError(
            visibleErrors.map((detail) => detail.message).join(" "),
          );
        }
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to complete the request. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function getFieldError(field: string): string | undefined {
    return fieldErrors
      .filter((detail) => detail.path === field)
      .map((detail) => detail.message)
      .join(" ");
  }

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <section className="flex min-h-36 items-center bg-primary px-6 py-8 text-primary-foreground md:min-h-screen md:px-12">
        <div className="mx-auto max-w-md">
          <p className="font-heading text-lg font-bold">PlotGuard</p>
          <h1 className="mt-3 font-heading text-brand font-bold">
            Land records you can see, question, and trust.
          </h1>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-card">
          <h2 className="font-heading text-2xl font-bold">
            {isSignup ? "Create your account" : "Log in"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup
              ? "Sign up to explore fictional land records."
              : "Sign in to continue to PlotGuard."}
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {isSignup && (
              <label className="block space-y-1 text-label font-medium">
                <span>Name</span>
                <input
                  aria-describedby={getFieldError("name") ? "name-error" : undefined}
                  aria-invalid={Boolean(getFieldError("name"))}
                  autoComplete="name"
                  className="h-10 w-full rounded-md border border-input bg-card px-3 font-normal aria-[invalid=true]:border-destructive focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
                {getFieldError("name") && (
                  <span className="block text-xs text-destructive" id="name-error" role="alert">
                    {getFieldError("name")}
                  </span>
                )}
              </label>
            )}
            <label className="block space-y-1 text-label font-medium">
              <span>Email</span>
              <input
                aria-describedby={getFieldError("email") ? "email-error" : undefined}
                aria-invalid={Boolean(getFieldError("email"))}
                autoComplete="email"
                className="h-10 w-full rounded-md border border-input bg-card px-3 font-normal aria-[invalid=true]:border-destructive focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
              {getFieldError("email") && (
                <span className="block text-xs text-destructive" id="email-error" role="alert">
                  {getFieldError("email")}
                </span>
              )}
            </label>
            <label className="block space-y-1 text-label font-medium">
              <span>Password</span>
              <input
                aria-describedby={getFieldError("password") ? "password-error" : undefined}
                aria-invalid={Boolean(getFieldError("password"))}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="h-10 w-full rounded-md border border-input bg-card px-3 font-normal aria-[invalid=true]:border-destructive focus-visible:ring-2 focus-visible:ring-ring"
                minLength={isSignup ? 8 : undefined}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              {getFieldError("password") && (
                <span className="block text-xs text-destructive" id="password-error" role="alert">
                  {getFieldError("password")}
                </span>
              )}
            </label>
            {isSignup && (
              <p className="text-xs text-muted-foreground">
                Use at least 8 characters with a letter and a number.
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <button
              className="h-10 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Please wait…"
                : isSignup
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>
          <p className="mt-5 text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to PlotGuard?"}{" "}
            <Link
              className="font-semibold text-primary underline"
              to={isSignup ? "/login" : "/signup"}
            >
              {isSignup ? "Log in" : "Sign up"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
