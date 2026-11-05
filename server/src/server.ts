import { app } from "./app.js";
import { connectToDatabase } from "./config/database.js";
import { env } from "./config/env.js";

app.listen(env.PORT, "127.0.0.1", () => {
  console.log(`PlotGuard API listening on http://127.0.0.1:${env.PORT}`);
});

connectToDatabase().catch((error: unknown) => {
  console.error(
    "MongoDB connection failed; the API remains available for health checks.",
    error,
  );
});
