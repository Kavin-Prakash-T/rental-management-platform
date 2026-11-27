import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  createPayment,
  getPayments,
  getPaymentById,
  getPaymentsByInvoice,
  refundPayment,
  reversePayment,
} from "../controllers/paymentController.js";
import {
  createPaymentSchema,
  paymentIdParamSchema,
  invoiceIdParamSchema,
  refundPaymentSchema,
  reversePaymentSchema,
  getPaymentsQuerySchema,
} from "../validators/paymentValidator.js";

const router = Router();

router.post(
  "/",
  authenticate,
  csrfProtection,
  validate({ body: createPaymentSchema }),
  createPayment
);

router.get(
  "/",
  authenticate,
  validate({ query: getPaymentsQuerySchema }),
  getPayments
);

router.get(
  "/invoice/:invoiceId",
  authenticate,
  validate({ params: invoiceIdParamSchema }),
  getPaymentsByInvoice
);

router.get(
  "/:id",
  authenticate,
  validate({ params: paymentIdParamSchema }),
  getPaymentById
);

router.post(
  "/:id/refund",
  authenticate,
  csrfProtection,
  validate({ params: paymentIdParamSchema, body: refundPaymentSchema }),
  refundPayment
);

router.post(
  "/:id/reverse",
  authenticate,
  csrfProtection,
  validate({ params: paymentIdParamSchema, body: reversePaymentSchema }),
  reversePayment
);

export default router;
