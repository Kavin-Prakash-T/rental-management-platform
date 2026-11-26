import { Router } from "express";
import * as inventoryController from "../controllers/inventoryController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import { checkAvailabilitySchema } from "../validators/inventoryValidator.js";

const router = Router();

router.post(
  "/check-availability",
  authenticate,
  csrfProtection,
  validate({ body: checkAvailabilitySchema }),
  inventoryController.checkAvailability
);

export default router;
