import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
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
  year: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 2020 && val <= 2100, {
      message: "Year must be a valid 4-digit year",
    })
    .optional(),
});

export const dashboardActivityQuerySchema = z.object({
  limit: z
    .string()
    .transform((val) => Math.min(50, Math.max(1, parseInt(val, 10) || 10)))
    .optional(),
});
