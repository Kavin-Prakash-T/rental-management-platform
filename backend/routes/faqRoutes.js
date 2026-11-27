import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import { verifyToken } from "../utils/jwt.js";
import Admin from "../models/Admin.js";
import {
  createFaq,
  getFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,
} from "../controllers/faqController.js";
import {
  createFaqSchema,
  updateFaqSchema,
  faqIdParamSchema,
  getFaqsQuerySchema,
} from "../validators/faqValidator.js";

const optionalAuthenticate = async (req, _res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.id) {
        const admin = await Admin.findById(decoded.id);
        if (admin && admin.isActive && admin.role === "admin") {
          req.admin = admin;
          req.adminId = admin._id;
        }
      }
    }
  } catch {}
  return next();
};

const router = Router();

router.post(
  "/",
  authenticate,
  csrfProtection,
  validate({ body: createFaqSchema }),
  createFaq
);

router.get(
  "/",
  optionalAuthenticate,
  validate({ query: getFaqsQuerySchema }),
  getFaqs
);

router.get(
  "/:id",
  optionalAuthenticate,
  validate({ params: faqIdParamSchema }),
  getFaqById
);

router.patch(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: faqIdParamSchema, body: updateFaqSchema }),
  updateFaq
);

router.delete(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: faqIdParamSchema }),
  deleteFaq
);

export default router;
