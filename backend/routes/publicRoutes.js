import { Router } from "express";
import { publicLimiter } from "../middlewares/rateLimitMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  getPublicBusiness,
  getPublicProducts,
  getPublicProductById,
  getPublicCategories,
  getPublicFaqs,
} from "../controllers/publicController.js";
import {
  publicProductsQuerySchema,
  publicProductIdParamSchema,
  publicFaqsQuerySchema,
} from "../validators/publicValidator.js";

const router = Router();

router.use(publicLimiter);

router.get("/business", getPublicBusiness);

router.get(
  "/products",
  validate({ query: publicProductsQuerySchema }),
  getPublicProducts
);

router.get(
  "/products/:id",
  validate({ params: publicProductIdParamSchema }),
  getPublicProductById
);

router.get("/categories", getPublicCategories);

router.get(
  "/faqs",
  validate({ query: publicFaqsQuerySchema }),
  getPublicFaqs
);

export default router;
