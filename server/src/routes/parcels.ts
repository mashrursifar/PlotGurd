import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  getParcelController,
  listParcelsController,
  createParcelController,
  searchParcelController,
  setParcelDisputeController,
  updateParcelController,
} from "../modules/parcels/parcel.controller.js";
import {
  getParcelHistoryController,
  recordParcelTransactionController,
  verifyParcelHistoryController,
} from "../modules/ledger/ledger.controller.js";
import {
  assessParcelRiskController,
  getLatestParcelRiskController,
} from "../modules/risk/risk.controller.js";
import { emptyRiskBodySchema } from "../modules/risk/risk.schema.js";
import {
  createParcelSchema,
  createTransactionSchema,
  disputeFlagSchema,
  updateParcelSchema,
} from "../modules/parcels/parcel.schema.js";

const router = Router();

router.use(authenticate);
router.get("/", listParcelsController);
router.post(
  "/",
  authorize("authority"),
  validateBody(createParcelSchema),
  createParcelController,
);
router.get("/search", searchParcelController);
router.get("/:id/history", getParcelHistoryController);
router.get("/:id/history/verify", verifyParcelHistoryController);
router.post(
  "/:id/risk",
  validateBody(emptyRiskBodySchema),
  assessParcelRiskController,
);
router.get("/:id/risk/latest", getLatestParcelRiskController);
router.patch(
  "/:id/dispute",
  authorize("authority"),
  validateBody(disputeFlagSchema),
  setParcelDisputeController,
);
router.post(
  "/:id/transactions",
  authorize("authority"),
  validateBody(createTransactionSchema),
  recordParcelTransactionController,
);
router.patch(
  "/:id",
  authorize("authority"),
  validateBody(updateParcelSchema),
  updateParcelController,
);
router.get("/:id", getParcelController);

export { router as parcelsRouter };
