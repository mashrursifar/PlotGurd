import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { listAuditLogsController } from "../modules/audit/audit.controller.js";

const router = Router();

router.use(authenticate, authorize("authority"));
router.get("/", listAuditLogsController);

export { router as auditRouter };
