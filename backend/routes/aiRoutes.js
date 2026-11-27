import { Router } from "express";
import { handleChat, handleAdminChat } from "../controllers/aiController.js";
import {
  chatLimiter,
  adminChatLimiter,
  sanitizeChatInput,
} from "../middlewares/aiMiddleware.js";
import authenticate from "../middlewares/authMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  chatMessageSchema,
  adminChatMessageSchema,
} from "../validators/aiValidator.js";

const router = Router();

router.post(
  "/chat",
  chatLimiter,
  sanitizeChatInput,
  validate({ body: chatMessageSchema }),
  handleChat
);

router.post(
  "/admin/chat",
  authenticate,
  adminChatLimiter,
  sanitizeChatInput,
  validate({ body: adminChatMessageSchema }),
  handleAdminChat
);

export default router;
