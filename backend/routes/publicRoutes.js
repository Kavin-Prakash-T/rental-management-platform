import { Router } from "express";
import { publicLimiter } from "../middlewares/rateLimitMiddleware.js";
import { chatLimiter, sanitizeChatInput } from "../middlewares/aiMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  getPublicBusiness,
  getPublicProducts,
  getPublicProductById,
  getPublicCategories,
  getPublicFaqs,
} from "../controllers/publicController.js";
import { handleChat } from "../controllers/aiController.js";
import {
  publicProductsQuerySchema,
  publicProductIdParamSchema,
  publicFaqsQuerySchema,
} from "../validators/publicValidator.js";
import { chatMessageSchema } from "../validators/aiValidator.js";

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

router.post(
  "/chat",
  chatLimiter,
  sanitizeChatInput,
  validate({ body: chatMessageSchema }),
  handleChat
);

export default router;
