import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import { adminChatLimiter, sanitizeChatInput } from "../middlewares/aiMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import { adminChatMessageSchema } from "../validators/aiValidator.js";
import { handleAdminChat } from "../controllers/aiController.js";

const router = Router();

router.post(
  "/chat",
  authenticate,
  adminChatLimiter,
  sanitizeChatInput,
  validate({ body: adminChatMessageSchema }),
  handleAdminChat
);

export default router;
