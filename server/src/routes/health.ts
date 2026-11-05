import { Router } from "express";
import { getDatabaseHealth } from "../config/database.js";
import { successResponse } from "../utils/response.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json(
    successResponse({
      status: "ok",
      database: getDatabaseHealth(),
    }),
  );
});
