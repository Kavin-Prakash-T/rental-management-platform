import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid identifier format",
});

export const createMaintenanceSchema = z
  .object({
    product: objectIdSchema,
    quantity: z
      .number({ message: "Quantity must be a number" })
      .int("Quantity must be an integer")
      .positive("Quantity must be greater than zero")
      .default(1),
    maintenanceType: z.enum(["scheduled", "corrective"]).default("scheduled").optional(),
    issueDescription: z.string().trim().max(1000).optional(),
    reason: z.string().trim().max(1000).optional(),
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
    status: z.enum(["scheduled", "in_progress"]).default("scheduled").optional(),
    cost: z.number().int().min(0, "Cost cannot be negative").default(0).optional(),
    performedBy: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(1000).optional(),
    forceConflictResolution: z.boolean().default(false).optional(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be strictly after start date",
    path: ["endDate"],
  });

export const updateMaintenanceSchema = z
  .object({
    quantity: z
      .number({ message: "Quantity must be a number" })
      .int("Quantity must be an integer")
      .positive("Quantity must be greater than zero")
      .optional(),
    maintenanceType: z.enum(["scheduled", "corrective"]).optional(),
    issueDescription: z.string().trim().max(1000).optional(),
    reason: z.string().trim().max(1000).optional(),
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
    cost: z.number().int().min(0, "Cost cannot be negative").optional(),
    performedBy: z.string().trim().max(200).optional(),
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

export const maintenanceIdParamSchema = z.object({
  id: objectIdSchema,
});

export const completeMaintenanceSchema = z.object({
  actualCompletionDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }))
    .optional(),
  cost: z.number().int().min(0, "Cost cannot be negative").optional(),
  performedBy: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const getMaintenanceQuerySchema = z.object({
  product: objectIdSchema.optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  maintenanceType: z.enum(["scheduled", "corrective"]).optional(),
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
