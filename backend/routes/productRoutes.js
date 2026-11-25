import { Router } from "express";
import * as productController from "../controllers/productController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  getProductsQuerySchema,
} from "../validators/productValidator.js";

const router = Router();

router.post(
  "/",
  authenticate,
  csrfProtection,
  validate({ body: createProductSchema }),
  productController.createProduct
);

router.get(
  "/",
  authenticate,
  validate({ query: getProductsQuerySchema }),
  productController.getProducts
);

router.get(
  "/:id",
  authenticate,
  validate({ params: productIdParamSchema }),
  productController.getProductById
);

router.patch(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  productController.updateProduct
);

router.delete(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: productIdParamSchema }),
  productController.deleteProduct
);

export default router;
