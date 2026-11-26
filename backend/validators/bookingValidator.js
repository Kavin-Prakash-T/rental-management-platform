import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

const bookingItemInputSchema = z.object({
  product: objectIdSchema,
  quantity: z
    .number({ message: "Quantity must be a number" })
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than zero"),
});

const transportationInputSchema = z.object({
  required: z.boolean().optional(),
  type: z.enum(["pickup", "delivery", "both", "none"]).optional(),
  fee: z.number().int().min(0, "Transportation fee cannot be negative").optional(),
  deliveryAddress: z
    .object({
      street: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      pincode: z.string().trim().optional(),
    })
    .optional(),
});

export const createBookingSchema = z
  .object({
    customer: objectIdSchema,
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
    rentalType: z.enum(["daily", "hourly"]).default("daily").optional(),
    items: z
      .array(bookingItemInputSchema)
      .min(1, "Booking must contain at least one equipment item"),
    discount: z.number().int().min(0, "Discount cannot be negative").optional(),
    refundableDeposit: z
      .number()
      .int()
      .min(0, "Refundable deposit cannot be negative")
      .optional(),
    transportation: transportationInputSchema.optional(),
    notes: z.string().trim().max(1000).optional(),
    idempotencyKey: z.string().trim().max(100).optional(),
    confirm: z.boolean().optional(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be strictly after start date",
    path: ["endDate"],
  });

export const updateBookingSchema = z
  .object({
    startDate: z
      .string()
      .datetime({ offset: true })
      .or(
        z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid start date format",
        })
      )
      .optional(),
    endDate: z
      .string()
      .datetime({ offset: true })
      .or(
        z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid end date format",
        })
      )
      .optional(),
    rentalType: z.enum(["daily", "hourly"]).optional(),
    items: z.array(bookingItemInputSchema).min(1).optional(),
    discount: z.number().int().min(0).optional(),
    refundableDeposit: z.number().int().min(0).optional(),
    transportation: transportationInputSchema.optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be strictly after start date",
      path: ["endDate"],
    }
  );

export const bookingIdParamSchema = z.object({
  id: objectIdSchema,
});

export const cancelBookingSchema = z.object({
  cancellationReason: z.string().trim().max(500).optional(),
});

export const getBookingsQuerySchema = z.object({
  customer: objectIdSchema.optional(),
  status: z.enum(["draft", "confirmed", "issued", "completed", "cancelled"]).optional(),
  search: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
