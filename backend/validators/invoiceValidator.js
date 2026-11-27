import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

export const generateInvoiceParamSchema = z.object({
  bookingId: objectIdSchema,
});

export const invoiceIdParamSchema = z.object({
  id: objectIdSchema,
});

export const cancelInvoiceSchema = z.object({
  cancellationReason: z.string().trim().max(500).optional(),
});

export const getInvoicesQuerySchema = z.object({
  booking: objectIdSchema.optional(),
  status: z.enum(["issued", "paid", "partially_paid", "cancelled"]).optional(),
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
