import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  closeEnquiryController,
  createEnquiryController,
  listAuthorityEnquiriesController,
  listMyEnquiriesController,
  replyToEnquiryController,
} from "../modules/enquiries/enquiry.controller.js";
import {
  createEnquirySchema,
  replyEnquirySchema,
} from "../modules/enquiries/enquiry.schema.js";

const router = Router();

router.use(authenticate);
router.post("/", validateBody(createEnquirySchema), createEnquiryController);
router.get("/mine", listMyEnquiriesController);
router.get("/", authorize("authority"), listAuthorityEnquiriesController);
router.patch(
  "/:id/reply",
  authorize("authority"),
  validateBody(replyEnquirySchema),
  replyToEnquiryController,
);
router.patch("/:id/close", authorize("authority"), closeEnquiryController);

export { router as enquiriesRouter };
