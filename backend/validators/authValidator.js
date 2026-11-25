import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address"),
  password: z
    .string()
    .min(1, "Password cannot be empty"),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Current password cannot be empty"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long"),
});
