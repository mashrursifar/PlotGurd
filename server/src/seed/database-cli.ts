import mongoose from "mongoose";
import { connectToDatabase } from "../config/database.js";

export async function withDatabase<T>(operation: () => Promise<T>): Promise<T> {
  try {
    await connectToDatabase();
    return await operation();
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

export async function runCli(
  label: string,
  operation: () => Promise<void>,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    console.error(`${label} failed: ${message}`);
    process.exitCode = 1;
  }
}
