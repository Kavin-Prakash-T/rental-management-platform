import { Router } from "express";
import * as maintenanceController from "../controllers/maintenanceController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  maintenanceIdParamSchema,
  completeMaintenanceSchema,
  getMaintenanceQuerySchema,
} from "../validators/maintenanceValidator.js";

const router = Router();

router.post(
  "/",
  authenticate,
  csrfProtection,
  validate({ body: createMaintenanceSchema }),
  maintenanceController.createMaintenance
);

router.get(
  "/",
  authenticate,
  validate({ query: getMaintenanceQuerySchema }),
  maintenanceController.getMaintenanceList
);

router.get(
  "/:id",
  authenticate,
  validate({ params: maintenanceIdParamSchema }),
  maintenanceController.getMaintenanceById
);

router.patch(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: maintenanceIdParamSchema, body: updateMaintenanceSchema }),
  maintenanceController.updateMaintenance
);

router.post(
  "/:id/start",
  authenticate,
  csrfProtection,
  validate({ params: maintenanceIdParamSchema }),
  maintenanceController.startMaintenance
);

router.post(
  "/:id/complete",
  authenticate,
  csrfProtection,
  validate({ params: maintenanceIdParamSchema, body: completeMaintenanceSchema }),
  maintenanceController.completeMaintenance
);

router.post(
  "/:id/cancel",
  authenticate,
  csrfProtection,
  validate({ params: maintenanceIdParamSchema }),
  maintenanceController.cancelMaintenance
);

export default router;
