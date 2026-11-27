import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

export const createPaymentSchema = z.object({
  booking: objectIdSchema,
  invoice: objectIdSchema.optional(),
  amount: z
    .number({ message: "Amount must be a number in paise" })
    .int("Amount must be an integer in paise")
    .positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["cash", "upi", "bank_transfer"]),
  transactionReference: z.string().trim().max(100).optional(),
  paymentDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }))
    .optional(),
  purpose: z.enum(["advance", "rental", "deposit"]).default("rental"),
  notes: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().trim().max(100).optional(),
});

export const paymentIdParamSchema = z.object({
  id: objectIdSchema,
});

export const invoiceIdParamSchema = z.object({
  invoiceId: objectIdSchema,
});

export const refundPaymentSchema = z.object({
  amount: z
    .number({ message: "Amount must be a number in paise" })
    .int("Amount must be an integer in paise")
    .positive("Refund amount must be greater than zero")
    .optional(),
  paymentMethod: z.enum(["cash", "upi", "bank_transfer"]).default("upi").optional(),
  transactionReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const reversePaymentSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const getPaymentsQuerySchema = z.object({
  booking: objectIdSchema.optional(),
  invoice: objectIdSchema.optional(),
  paymentMethod: z.enum(["cash", "upi", "bank_transfer"]).optional(),
  purpose: z.enum(["advance", "rental", "deposit", "refund", "reversal"]).optional(),
  status: z.enum(["verified", "reversed", "refunded"]).optional(),
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
