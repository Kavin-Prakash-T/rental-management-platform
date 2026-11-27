import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

export const productIdParamSchema = z.object({
  productId: objectIdSchema,
});

const availabilityItemSchema = z.object({
  product: objectIdSchema,
  quantity: z
    .number({ message: "Quantity must be a number" })
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than zero"),
});

export const checkAvailabilitySchema = z
  .object({
    startDate: z.string().datetime({ offset: true }).or(
      z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid start date format",
      })
    ),
    endDate: z.string().datetime({ offset: true }).or(
      z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid end date format",
      })
    ),
    items: z
      .array(availabilityItemSchema)
      .min(1, "At least one equipment item is required"),
  })
  .refine(
    (data) => new Date(data.endDate) > new Date(data.startDate),
    {
      message: "End date must be strictly after start date",
      path: ["endDate"],
    }
  );

export const getInventoryQuerySchema = z.object({
  category: objectIdSchema.optional(),
  search: z.string().trim().optional(),
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
