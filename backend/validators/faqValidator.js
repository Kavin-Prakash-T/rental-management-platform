import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

const keywordsTransform = z
  .union([z.array(z.string().trim()), z.string()])
  .optional()
  .transform((val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0);
    }
    return val
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);
  });

export const createFaqSchema = z.object({
  question: z
    .string({ message: "Question is required" })
    .trim()
    .min(5, "Question must be at least 5 characters")
    .max(300, "Question cannot exceed 300 characters"),
  answer: z
    .string({ message: "Answer is required" })
    .trim()
    .min(10, "Answer must be at least 10 characters")
    .max(2000, "Answer cannot exceed 2000 characters"),
  category: z
    .string()
    .trim()
    .min(2, "Category must be at least 2 characters")
    .max(50, "Category cannot exceed 50 characters")
    .default("General")
    .optional(),
  keywords: keywordsTransform,
  displayOrder: z
    .number({ message: "Display order must be a number" })
    .int("Display order must be an integer")
    .min(0, "Display order cannot be negative")
    .default(0)
    .optional(),
  isActive: z.boolean().default(true).optional(),
});

export const updateFaqSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(5, "Question must be at least 5 characters")
      .max(300, "Question cannot exceed 300 characters")
      .optional(),
    answer: z
      .string()
      .trim()
      .min(10, "Answer must be at least 10 characters")
      .max(2000, "Answer cannot exceed 2000 characters")
      .optional(),
    category: z
      .string()
      .trim()
      .min(2, "Category must be at least 2 characters")
      .max(50, "Category cannot exceed 50 characters")
      .optional(),
    keywords: keywordsTransform,
    displayOrder: z
      .number()
      .int("Display order must be an integer")
      .min(0, "Display order cannot be negative")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const faqIdParamSchema = z.object({
  id: objectIdSchema,
});

export const getFaqsQuerySchema = z.object({
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
  isActive: z
    .string()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      if (val === "all") return "all";
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
  sortBy: z.string().trim().default("displayOrder").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
});
