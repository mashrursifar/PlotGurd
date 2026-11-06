import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getParcelController,
  listParcelsController,
  searchParcelController,
} from "../modules/parcels/parcel.controller.js";

const router = Router();

router.use(authenticate);
router.get("/", listParcelsController);
router.get("/search", searchParcelController);
router.get("/:id", getParcelController);

export { router as parcelsRouter };
