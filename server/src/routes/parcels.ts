import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getParcelController,
  listParcelsController,
  searchParcelController,
} from "../modules/parcels/parcel.controller.js";
import {
  getParcelHistoryController,
  verifyParcelHistoryController,
} from "../modules/ledger/ledger.controller.js";

const router = Router();

router.use(authenticate);
router.get("/", listParcelsController);
router.get("/search", searchParcelController);
router.get("/:id/history", getParcelHistoryController);
router.get("/:id/history/verify", verifyParcelHistoryController);
router.get("/:id", getParcelController);

export { router as parcelsRouter };
