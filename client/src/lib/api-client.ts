interface HealthData {
  status: "ok";
  database: "connected" | "connecting" | "disconnected";
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "authority";
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requestData(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw new Error(
        "Unable to reach the API. Make sure the server is running and configured.",
      );
    }
    throw error;
  }

  let body: unknown;
  try {
    body = JSON.parse(await response.text()) as unknown;
  } catch {
    throw new ApiError(
      `The API returned a non-JSON response (HTTP ${response.status}). Check the server terminal for startup errors.`,
      response.status,
      "INVALID_API_RESPONSE",
    );
  }

  if (!isRecord(body) || typeof body.success !== "boolean") {
    throw new Error("The API returned an invalid response.");
  }

  if (!response.ok || body.success !== true) {
    const error = body.error;
    const message =
      isRecord(error) && typeof error.message === "string"
        ? error.message
        : "The API request failed.";
    const code =
      isRecord(error) && typeof error.code === "string"
        ? error.code
        : "INTERNAL_ERROR";
    const details =
      isRecord(error) && Array.isArray(error.details)
        ? error.details.flatMap((detail): ApiErrorDetail[] =>
            isRecord(detail) &&
            typeof detail.path === "string" &&
            typeof detail.message === "string"
              ? [{ path: detail.path, message: detail.message }]
              : [],
          )
        : [];
    throw new ApiError(message, response.status, code, details);
  }

  return body.data;
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    (value.role === "user" || value.role === "authority")
  );
}

function isHealthData(value: unknown): value is HealthData {
  return (
    isRecord(value) &&
    value.status === "ok" &&
    (value.database === "connected" ||
      value.database === "connecting" ||
      value.database === "disconnected")
  );
}

export async function getHealth(): Promise<HealthData> {
  const data = await requestData("/api/health");
  if (!isHealthData(data)) {
    throw new Error("The API returned an invalid health response.");
  }
  return data;
}

export async function signupUser(input: SignupInput): Promise<AuthUser> {
  const data = await requestData("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!isAuthUser(data)) {
    throw new Error("The API returned an invalid user response.");
  }
  return data;
}

export async function loginUser(input: LoginInput): Promise<AuthUser> {
  const data = await requestData("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!isAuthUser(data)) {
    throw new Error("The API returned an invalid user response.");
  }
  return data;
}

export async function logoutUser(): Promise<void> {
  await requestData("/api/auth/logout", { method: "POST" });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const data = await requestData("/api/auth/me");
    if (!isAuthUser(data)) {
      throw new Error("The API returned an invalid user response.");
    }
    return data;
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
