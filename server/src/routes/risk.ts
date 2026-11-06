import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import {
  getAllRiskAssessmentsController,
  getUserRiskAssessmentsController,
} from "../modules/risk/risk.controller.js";

const router = Router();

router.use(authenticate);
router.get("/mine", getUserRiskAssessmentsController);
router.get("/all", authorize("authority"), getAllRiskAssessmentsController);

export { router as riskRouter };
