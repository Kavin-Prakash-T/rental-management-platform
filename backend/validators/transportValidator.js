import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

const addressInputSchema = z.object({
  street: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
});

export const createTransportSchema = z.object({
  booking: objectIdSchema,
  serviceType: z.enum(["delivery", "pickup", "both"]).default("delivery").optional(),
  providerName: z
    .string()
    .trim()
    .min(2, "Provider name must be at least 2 characters")
    .max(100),
  contactNumber: z
    .string()
    .trim()
    .min(10, "Contact number must be at least 10 characters")
    .max(20)
    .refine((val) => /^[+0-9\s\-()]+$/.test(val), {
      message: "Contact number contains invalid characters",
    }),
  vehicleNumber: z.string().trim().max(30).optional(),
  pickupAddress: addressInputSchema.optional(),
  deliveryAddress: addressInputSchema.optional(),
  scheduledDate: z.string().datetime({ offset: true }).or(
    z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid scheduled date format",
    })
  ),
  transportationCost: z
    .number()
    .int("Cost must be an integer paise amount")
    .min(0, "Transportation cost cannot be negative")
    .default(0)
    .optional(),
  arrangementFee: z
    .number()
    .int("Arrangement fee must be an integer paise amount")
    .min(0, "Arrangement fee cannot be negative")
    .default(0)
    .optional(),
  paymentResponsibility: z
    .enum(["customer_direct", "shop_collected"])
    .default("shop_collected")
    .optional(),
  paymentStatus: z
    .enum(["pending", "collected", "paid_to_provider", "completed", "cancelled"])
    .default("pending")
    .optional(),
  status: z
    .enum(["scheduled", "in_transit", "completed", "cancelled"])
    .default("scheduled")
    .optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateTransportSchema = z.object({
  serviceType: z.enum(["delivery", "pickup", "both"]).optional(),
  providerName: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional(),
  contactNumber: z
    .string()
    .trim()
    .min(10)
    .max(20)
    .refine((val) => /^[+0-9\s\-()]+$/.test(val), {
      message: "Contact number contains invalid characters",
    })
    .optional(),
  vehicleNumber: z.string().trim().max(30).optional(),
  pickupAddress: addressInputSchema.optional(),
  deliveryAddress: addressInputSchema.optional(),
  scheduledDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }))
    .optional(),
  transportationCost: z.number().int().min(0).optional(),
  arrangementFee: z.number().int().min(0).optional(),
  paymentResponsibility: z.enum(["customer_direct", "shop_collected"]).optional(),
  paymentStatus: z
    .enum(["pending", "collected", "paid_to_provider", "completed", "cancelled"])
    .optional(),
  status: z.enum(["scheduled", "in_transit", "completed", "cancelled"]).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const transportIdParamSchema = z.object({
  id: objectIdSchema,
});

export const updateTransportStatusSchema = z.object({
  status: z.enum(["scheduled", "in_transit", "completed", "cancelled"]).optional(),
  paymentStatus: z
    .enum(["pending", "collected", "paid_to_provider", "completed", "cancelled"])
    .optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const cancelTransportSchema = z.object({
  cancellationNotes: z.string().trim().max(500).optional(),
});

export const getTransportsQuerySchema = z.object({
  booking: objectIdSchema.optional(),
  status: z.enum(["scheduled", "in_transit", "completed", "cancelled"]).optional(),
  paymentResponsibility: z.enum(["customer_direct", "shop_collected"]).optional(),
  paymentStatus: z
    .enum(["pending", "collected", "paid_to_provider", "completed", "cancelled"])
    .optional(),
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
