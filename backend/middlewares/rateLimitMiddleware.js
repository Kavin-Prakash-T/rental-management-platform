import rateLimit from "express-rate-limit";
import ApiError from "../utils/ApiError.js";

const createLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 100;
  const message = options.message || "Too many requests, please try again later";

  return rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(ApiError.tooManyRequests(message));
    },
    skip: () => process.env.NODE_ENV === "test",
    ...options,
  });
};

export const apiLimiter = createLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: "Too many requests from this IP to the API, please try again later",
});

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts, please try again after 15 minutes",
});

export const publicLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many requests to public resources, please slow down",
});

export default createLimiter;
