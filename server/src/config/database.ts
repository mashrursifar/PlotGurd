import mongoose from "mongoose";
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
