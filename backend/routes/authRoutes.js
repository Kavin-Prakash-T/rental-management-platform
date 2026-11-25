import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import { authLimiter } from "../middlewares/rateLimitMiddleware.js";
import { loginSchema, changePasswordSchema } from "../validators/authValidator.js";

const router = Router();

router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.getMe);
router.patch(
  "/change-password",
  authenticate,
  csrfProtection,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
