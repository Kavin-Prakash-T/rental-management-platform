import rateLimit from "express-rate-limit";
import ApiError from "../utils/ApiError.js";

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.CHAT_RATE_LIMIT_MAX) || 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests("Too many chat requests. Please wait a moment before sending another message."));
  },
  skip: () => process.env.NODE_ENV === "test",
});

export const adminChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.ADMIN_CHAT_RATE_LIMIT_MAX) || 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests("Too many administrative chat requests. Please slow down."));
  },
  skip: () => process.env.NODE_ENV === "test",
});

export const sanitizeChatInput = (req, _res, next) => {
  if (req.body && typeof req.body.message === "string") {
    req.body.message = req.body.message.trim();
  }
  next();
};
