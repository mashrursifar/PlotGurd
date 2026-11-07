import mongoose, { type ClientSession } from "mongoose";
import { env } from "./env.js";

export type DatabaseHealth = "connected" | "connecting" | "disconnected";

export function getDatabaseHealth(): DatabaseHealth {
  switch (mongoose.connection.readyState) {
    case 1:
      return "connected";
    case 2:
      return "connecting";
    default:
      return "disconnected";
  }
}

export async function connectToDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 3000,
  });
}

export async function withDatabaseTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(() => operation(session));
    if (result === undefined) {
      throw new Error("Database transaction completed without a result.");
    }
    return result;
  } finally {
    await session.endSession();
  }
}
