import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z
    .string({ required_error: "Message is required" })
    .trim()
    .min(1, "Message cannot be empty")
    .max(500, "Message cannot exceed 500 characters"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"], {
          errorMap: () => ({ message: "Role must be user or assistant" }),
        }),
        content: z
          .string({ required_error: "History content is required" })
          .trim()
          .min(1, "History content cannot be empty")
          .max(500, "History message cannot exceed 500 characters"),
      })
    )
    .max(6, "Conversation history cannot exceed 6 messages")
    .optional()
    .default([]),
});

export const adminChatMessageSchema = z.object({
  message: z
    .string({ required_error: "Message is required" })
    .trim()
    .min(1, "Message cannot be empty")
    .max(1000, "Message cannot exceed 1000 characters"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"], {
          errorMap: () => ({ message: "Role must be user or assistant" }),
        }),
        content: z
          .string({ required_error: "History content is required" })
          .trim()
          .min(1, "History content cannot be empty")
          .max(1000, "History message cannot exceed 1000 characters"),
      })
    )
    .max(6, "Conversation history cannot exceed 6 messages")
    .optional()
    .default([]),
});
