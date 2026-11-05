import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { createRateLimit } from "../middleware/rate-limit.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  loginController,
  logoutController,
  meController,
  signupController,
} from "../modules/auth/auth.controller.js";
import { loginSchema, signupSchema } from "../modules/auth/auth.schema.js";

const router = Router();
const authRateLimit = createRateLimit({ limit: 10, windowMs: 15 * 60 * 1000 });

router.post(
  "/signup",
  authRateLimit,
  validateBody(signupSchema),
  signupController,
);
router.post(
  "/login",
  authRateLimit,
  validateBody(loginSchema),
  loginController,
);
router.post("/logout", authenticate, logoutController);
router.get("/me", authenticate, meController);

export { router as authRouter };
