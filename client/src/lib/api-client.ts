interface HealthData {
  status: "ok";
  database: "connected" | "connecting" | "disconnected";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function requestData(path: string): Promise<unknown> {
  const response = await fetch(path, { credentials: "include" });
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new Error("The API returned invalid JSON.");
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
    throw new Error(message);
  }

  return body.data;
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
