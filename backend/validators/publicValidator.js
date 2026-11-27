import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

export const publicProductsQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  condition: z.enum(["new", "good", "fair", "poor"]).optional(),
  page: z
    .string()
    .transform((val) => Math.max(1, parseInt(val, 10) || 1))
    .optional(),
  limit: z
    .string()
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 12)))
    .optional(),
  sortBy: z.enum(["name", "dailyRate", "hourlyRate", "createdAt"]).default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export const publicProductIdParamSchema = z.object({
  id: objectIdSchema,
});

export const publicFaqsQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
});
