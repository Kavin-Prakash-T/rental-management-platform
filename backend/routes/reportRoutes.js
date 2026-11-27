import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  getRevenueReport,
  getExpenseReport,
  getProfitReport,
  getProductReport,
  getUtilizationReport,
  getCustomerReport,
  getOutstandingReport,
  getMaintenanceReport,
  exportReportCsv,
} from "../controllers/reportController.js";
import {
  dateRangeQuerySchema,
  productReportQuerySchema,
  utilizationReportQuerySchema,
  customerReportQuerySchema,
  exportReportQuerySchema,
} from "../validators/reportValidator.js";

const router = Router();

router.get(
  "/revenue",
  authenticate,
  validate({ query: dateRangeQuerySchema }),
  getRevenueReport
);

router.get(
  "/expenses",
  authenticate,
  validate({ query: dateRangeQuerySchema }),
  getExpenseReport
);

router.get(
  "/profit",
  authenticate,
  validate({ query: dateRangeQuerySchema }),
  getProfitReport
);

router.get(
  "/products",
  authenticate,
  validate({ query: productReportQuerySchema }),
  getProductReport
);

router.get(
  "/utilization",
  authenticate,
  validate({ query: utilizationReportQuerySchema }),
  getUtilizationReport
);

router.get(
  "/customers",
  authenticate,
  validate({ query: customerReportQuerySchema }),
  getCustomerReport
);

router.get(
  "/outstanding",
  authenticate,
  validate({ query: dateRangeQuerySchema }),
  getOutstandingReport
);

router.get(
  "/maintenance",
  authenticate,
  validate({ query: dateRangeQuerySchema }),
  getMaintenanceReport
);

router.get(
  "/export",
  authenticate,
  validate({ query: exportReportQuerySchema }),
  exportReportCsv
);

export default router;
