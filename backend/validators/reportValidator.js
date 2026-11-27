import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

const dateStringSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }))
  .optional();

export const dateRangeQuerySchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  groupBy: z.enum(["day", "month", "year"]).default("month").optional(),
});

export const productReportQuerySchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  limit: z
    .string()
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10)))
    .optional(),
  category: objectIdSchema.optional(),
});

export const utilizationReportQuerySchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  productId: objectIdSchema.optional(),
});

export const customerReportQuerySchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  limit: z
    .string()
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20)))
    .optional(),
  search: z.string().trim().optional(),
});

export const exportReportQuerySchema = z.object({
  type: z.enum([
    "revenue",
    "expenses",
    "profit",
    "products",
    "utilization",
    "customers",
    "outstanding",
    "maintenance",
    "transportation",
  ]),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
});
