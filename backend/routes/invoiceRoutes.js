import { Router } from "express";
import * as invoiceController from "../controllers/invoiceController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  generateInvoiceParamSchema,
  invoiceIdParamSchema,
  cancelInvoiceSchema,
  getInvoicesQuerySchema,
} from "../validators/invoiceValidator.js";

const router = Router();

router.post(
  "/generate/:bookingId",
  authenticate,
  csrfProtection,
  validate({ params: generateInvoiceParamSchema }),
  invoiceController.generateInvoice
);

router.get(
  "/",
  authenticate,
  validate({ query: getInvoicesQuerySchema }),
  invoiceController.getInvoices
);

router.get(
  "/:id",
  authenticate,
  validate({ params: invoiceIdParamSchema }),
  invoiceController.getInvoiceById
);

router.get(
  "/:id/pdf",
  authenticate,
  validate({ params: invoiceIdParamSchema }),
  invoiceController.getInvoicePdf
);

router.get(
  "/:id/qr",
  authenticate,
  validate({ params: invoiceIdParamSchema }),
  invoiceController.getInvoiceQr
);

router.post(
  "/:id/cancel",
  authenticate,
  csrfProtection,
  validate({ params: invoiceIdParamSchema, body: cancelInvoiceSchema }),
  invoiceController.cancelInvoice
);

export default router;
