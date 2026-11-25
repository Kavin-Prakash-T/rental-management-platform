import { Router } from "express";
import * as settingsController from "../controllers/settingsController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import { updateSettingsSchema } from "../validators/settingsValidator.js";

const router = Router();

router.get("/public", settingsController.getPublicSettings);
router.get("/", authenticate, settingsController.getSettings);
router.patch(
  "/",
  authenticate,
  csrfProtection,
  validate(updateSettingsSchema),
  settingsController.updateSettings
);

export default router;
