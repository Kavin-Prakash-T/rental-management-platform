import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

const expenseCategorySchema = z.enum(
  [
    "equipment_purchase",
    "maintenance",
    "salaries",
    "electricity",
    "shop_rent",
    "fuel",
    "miscellaneous",
  ],
  {
    errorMap: () => ({
      message:
        "Invalid expense category. Must be equipment_purchase, maintenance, salaries, electricity, shop_rent, fuel, or miscellaneous",
    }),
  }
);

export const createExpenseSchema = z.object({
  category: expenseCategorySchema,
  amount: z
    .number({ message: "Amount must be a number in paise" })
    .int("Amount must be an integer in paise")
    .positive("Expense amount must be greater than zero"),
  description: z
    .string({ message: "Description is required" })
    .trim()
    .min(2, "Description must be at least 2 characters")
    .max(500, "Description cannot exceed 500 characters"),
  date: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }))
    .optional(),
  paymentMethod: z.enum(["cash", "upi", "bank_transfer"], {
    errorMap: () => ({ message: "Payment method must be cash, upi, or bank_transfer" }),
  }),
  relatedEntity: z
    .object({
      entityType: z.enum(["Maintenance", "Product", "Transport", "none"]).default("none"),
      entityId: objectIdSchema.nullable().optional(),
    })
    .optional(),
  relatedMaintenance: objectIdSchema.nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateExpenseSchema = z
  .object({
    category: expenseCategorySchema.optional(),
    amount: z
      .number({ message: "Amount must be a number in paise" })
      .int("Amount must be an integer in paise")
      .positive("Expense amount must be greater than zero")
      .optional(),
    description: z
      .string()
      .trim()
      .min(2, "Description must be at least 2 characters")
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
    date: z
      .string()
      .datetime({ offset: true })
      .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }))
      .optional(),
    paymentMethod: z.enum(["cash", "upi", "bank_transfer"]).optional(),
    relatedEntity: z
      .object({
        entityType: z.enum(["Maintenance", "Product", "Transport", "none"]).default("none"),
        entityId: objectIdSchema.nullable().optional(),
      })
      .optional(),
    relatedMaintenance: objectIdSchema.nullable().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const expenseIdParamSchema = z.object({
  id: objectIdSchema,
});

export const voidExpenseSchema = z.object({
  reason: z
    .string({ message: "Void reason is required" })
    .trim()
    .min(3, "Void reason must be at least 3 characters")
    .max(500, "Void reason cannot exceed 500 characters"),
});

export const getExpensesQuerySchema = z.object({
  category: expenseCategorySchema.optional(),
  paymentMethod: z.enum(["cash", "upi", "bank_transfer"]).optional(),
  status: z.enum(["active", "voided", "all"]).optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }))
    .optional(),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }))
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

export const expenseSummaryQuerySchema = z.object({
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }))
    .optional(),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }))
    .optional(),
  category: expenseCategorySchema.optional(),
});
