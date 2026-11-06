import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  getParcelController,
  listParcelsController,
  searchParcelController,
} from "../modules/parcels/parcel.controller.js";
import {
  getParcelHistoryController,
  verifyParcelHistoryController,
} from "../modules/ledger/ledger.controller.js";
import {
  assessParcelRiskController,
  getLatestParcelRiskController,
} from "../modules/risk/risk.controller.js";
import { emptyRiskBodySchema } from "../modules/risk/risk.schema.js";

const router = Router();

router.use(authenticate);
router.get("/", listParcelsController);
router.get("/search", searchParcelController);
router.get("/:id/history", getParcelHistoryController);
router.get("/:id/history/verify", verifyParcelHistoryController);
router.post(
  "/:id/risk",
  validateBody(emptyRiskBodySchema),
  assessParcelRiskController,
);
router.get("/:id/risk/latest", getLatestParcelRiskController);
router.get("/:id", getParcelController);

export { router as parcelsRouter };
