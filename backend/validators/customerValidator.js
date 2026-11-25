import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

export const customerIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Customer name must be at least 2 characters long").max(100),
  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number cannot exceed 20 characters")
    .refine((val) => /^[+0-9\s\-()]+$/.test(val), {
      message: "Phone number contains invalid characters",
    }),
  email: z
    .string()
    .trim()
    .email("Invalid email address format")
    .optional()
    .or(z.literal("")),
  address: z
    .object({
      street: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      pincode: z.string().trim().optional(),
    })
    .optional(),
  notes: z.string().trim().max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(2, "Customer name must be at least 2 characters long").max(100).optional(),
    phone: z
      .string()
      .trim()
      .min(10, "Phone number must be at least 10 digits")
      .max(20, "Phone number cannot exceed 20 characters")
      .refine((val) => /^[+0-9\s\-()]+$/.test(val), {
        message: "Phone number contains invalid characters",
      })
      .optional(),
    email: z
      .string()
      .trim()
      .email("Invalid email address format")
      .optional()
      .or(z.literal("")),
    address: z
      .object({
        street: z.string().trim().optional(),
        city: z.string().trim().optional(),
        state: z.string().trim().optional(),
        pincode: z.string().trim().optional(),
      })
      .optional(),
    notes: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const getCustomersQuerySchema = z.object({
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
