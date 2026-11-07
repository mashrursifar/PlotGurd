import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { parcelsRouter } from "./routes/parcels.js";
import { riskRouter } from "./routes/risk.js";
import { enquiriesRouter } from "./routes/enquiries.js";
import { failureResponse } from "./utils/response.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/parcels", parcelsRouter);
app.use("/api/risk", riskRouter);
app.use("/api/enquiries", enquiriesRouter);

app.use((_request, response) => {
  response.status(404).json(failureResponse("NOT_FOUND", "Route not found."));
});
app.use(errorHandler);
