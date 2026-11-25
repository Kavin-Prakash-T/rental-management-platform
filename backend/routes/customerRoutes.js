import { Router } from "express";
import * as customerController from "../controllers/customerController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  getCustomersQuerySchema,
} from "../validators/customerValidator.js";

const router = Router();

router.post(
  "/",
  authenticate,
  csrfProtection,
  validate({ body: createCustomerSchema }),
  customerController.createCustomer
);

router.get(
  "/",
  authenticate,
  validate({ query: getCustomersQuerySchema }),
  customerController.getCustomers
);

router.get(
  "/:id",
  authenticate,
  validate({ params: customerIdParamSchema }),
  customerController.getCustomerById
);

router.patch(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: customerIdParamSchema, body: updateCustomerSchema }),
  customerController.updateCustomer
);

router.delete(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: customerIdParamSchema }),
  customerController.deleteCustomer
);

export default router;
