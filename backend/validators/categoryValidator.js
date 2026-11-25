import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid category identifier",
});

export const categoryIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long").max(100),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters long").max(100).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const getCategoriesQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: z
    .string()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    })
    .optional(),
  page: z
    .string()
    .transform((val) => Math.max(1, parseInt(val, 10) || 1))
    .optional(),
  limit: z
    .string()
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10)))
    .optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
