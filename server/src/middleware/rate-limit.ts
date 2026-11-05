import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface ClientWindow {
  count: number;
  resetAt: number;
}

export function createRateLimit({
  limit,
  windowMs,
}: RateLimitOptions): RequestHandler {
  const clients = new Map<string, ClientWindow>();

  return (request, _response, next) => {
    const now = Date.now();
    const key = request.ip ?? "unknown";
    let client = clients.get(key);

    if (!client || client.resetAt <= now) {
      if (clients.size >= 10_000) {
        for (const [clientKey, window] of clients) {
          if (window.resetAt <= now) clients.delete(clientKey);
        }
      }

      client = { count: 0, resetAt: now + windowMs };
      clients.set(key, client);
    }

    client.count += 1;
    if (client.count > limit) {
      next(
        new AppError(
          "RATE_LIMITED",
          429,
          "Too many authentication attempts. Try again later.",
        ),
      );
      return;
    }

    next();
  };
}
