import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

export const productIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters long").max(150),
  sku: z.string().trim().min(2).max(50).optional(),
  category: objectIdSchema,
  description: z.string().trim().max(1000).optional(),
  totalQuantity: z.number().int("Quantity must be an integer").min(0, "Total quantity cannot be negative"),
  hourlyRate: z.number().int("Rate must be in integer paise").min(0, "Hourly rate cannot be negative").optional(),
  dailyRate: z.number().int("Rate must be in integer paise").min(0, "Daily rate cannot be negative"),
  purchasePrice: z.number().int("Price must be in integer paise").min(0, "Purchase price cannot be negative").optional(),
  condition: z.enum(["new", "good", "fair", "poor"]).optional(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2, "Product name must be at least 2 characters long").max(150).optional(),
    sku: z.string().trim().min(2).max(50).optional(),
    category: objectIdSchema.optional(),
    description: z.string().trim().max(1000).optional(),
    totalQuantity: z.number().int("Quantity must be an integer").min(0, "Total quantity cannot be negative").optional(),
    hourlyRate: z.number().int("Rate must be in integer paise").min(0, "Hourly rate cannot be negative").optional(),
    dailyRate: z.number().int("Rate must be in integer paise").min(0, "Daily rate cannot be negative").optional(),
    purchasePrice: z.number().int("Price must be in integer paise").min(0, "Purchase price cannot be negative").optional(),
    condition: z.enum(["new", "good", "fair", "poor"]).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const getProductsQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z
    .string()
    .trim()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid category identifier format",
    })
    .optional(),
  condition: z.enum(["new", "good", "fair", "poor"]).optional(),
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
