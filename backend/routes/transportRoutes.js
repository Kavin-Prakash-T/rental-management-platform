import { Router } from "express";
import * as transportController from "../controllers/transportController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  createTransportSchema,
  updateTransportSchema,
  transportIdParamSchema,
  updateTransportStatusSchema,
  cancelTransportSchema,
  getTransportsQuerySchema,
} from "../validators/transportValidator.js";

const router = Router();

router.post(
  "/",
  authenticate,
  csrfProtection,
  validate({ body: createTransportSchema }),
  transportController.createTransport
);

router.get(
  "/",
  authenticate,
  validate({ query: getTransportsQuerySchema }),
  transportController.getTransports
);

router.get(
  "/:id",
  authenticate,
  validate({ params: transportIdParamSchema }),
  transportController.getTransportById
);

router.patch(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: transportIdParamSchema, body: updateTransportSchema }),
  transportController.updateTransport
);

router.post(
  "/:id/cancel",
  authenticate,
  csrfProtection,
  validate({ params: transportIdParamSchema, body: cancelTransportSchema }),
  transportController.cancelTransport
);

router.patch(
  "/:id/status",
  authenticate,
  csrfProtection,
  validate({ params: transportIdParamSchema, body: updateTransportStatusSchema }),
  transportController.updateTransportStatus
);

export default router;
