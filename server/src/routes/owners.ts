import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  createOwnerController,
  getOwnerSummaryController,
  listOwnersController,
} from "../modules/owners/owner.controller.js";
import { createOwnerSchema } from "../modules/owners/owner.schema.js";

const router = Router();

router.use(authenticate);
router.get("/", authorize("authority"), listOwnersController);
router.post(
  "/",
  authorize("authority"),
  validateBody(createOwnerSchema),
  createOwnerController,
);
router.get("/:id", getOwnerSummaryController);

export { router as ownersRouter };
