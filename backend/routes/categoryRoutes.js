import { Router } from "express";
import * as categoryController from "../controllers/categoryController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  getCategoriesQuerySchema,
} from "../validators/categoryValidator.js";

const router = Router();

router.post(
  "/",
  authenticate,
  csrfProtection,
  validate({ body: createCategorySchema }),
  categoryController.createCategory
);

router.get(
  "/",
  authenticate,
  validate({ query: getCategoriesQuerySchema }),
  categoryController.getCategories
);

router.get(
  "/:id",
  authenticate,
  validate({ params: categoryIdParamSchema }),
  categoryController.getCategoryById
);

router.patch(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  categoryController.updateCategory
);

router.delete(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: categoryIdParamSchema }),
  categoryController.deleteCategory
);

export default router;
