import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  getDashboardSummary,
  getDashboardActivity,
} from "../controllers/dashboardController.js";
import {
  dashboardSummaryQuerySchema,
  dashboardActivityQuerySchema,
} from "../validators/dashboardValidator.js";

const router = Router();

router.get(
  "/summary",
  authenticate,
  validate({ query: dashboardSummaryQuerySchema }),
  getDashboardSummary
);

router.get(
  "/activity",
  authenticate,
  validate({ query: dashboardActivityQuerySchema }),
  getDashboardActivity
);

export default router;
