import { z } from "zod";

export const updateSettingsSchema = z
  .object({
    businessName: z.string().trim().min(1, "Business name cannot be empty").optional(),
    address: z
      .object({
        street: z.string().trim().optional(),
        city: z.string().trim().optional(),
        state: z.string().trim().optional(),
        pincode: z.string().trim().optional(),
        country: z.string().trim().optional(),
      })
      .optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().email("Invalid business email address").optional(),
    openingHours: z.string().trim().optional(),
    upiId: z.string().trim().optional(),
    upiDisplayName: z.string().trim().optional(),
    invoicePrefix: z.string().trim().min(1).max(10).optional(),
    depositConfig: z
      .object({
        type: z.enum(["percentage", "fixed"]),
        value: z.number().min(0, "Deposit value must be positive"),
      })
      .optional(),
    transportationFee: z
      .object({
        baseFee: z.number().min(0, "Base fee must be positive"),
        perKmFee: z.number().min(0, "Per-km fee must be positive"),
      })
      .optional(),
    taxConfig: z
      .object({
        enabled: z.boolean().optional(),
        gstin: z.string().trim().optional(),
        cgstRate: z.number().min(0).max(100).optional(),
        sgstRate: z.number().min(0).max(100).optional(),
        igstRate: z.number().min(0).max(100).optional(),
      })
      .optional(),
    currency: z.string().trim().min(1).max(10).optional(),
    rentalPolicies: z
      .object({
        termsAndConditions: z.string().optional(),
        cancellationPolicy: z.string().optional(),
        damagePolicy: z.string().optional(),
      })
      .optional(),
    returnReminderPreferences: z
      .object({
        enabled: z.boolean().optional(),
        remindDaysBefore: z.number().int().min(0).optional(),
        reminderHourIST: z.number().int().min(0).max(23).optional(),
      })
      .optional(),
  })
  .strict();
