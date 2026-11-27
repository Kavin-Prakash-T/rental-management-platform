import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { processChatMessage, processAdminChatMessage } from "../services/aiService.js";

export const handleChat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  const result = await processChatMessage({ message, history });
  return ApiResponse.success(res, result, "Chat response processed successfully");
});

export const handleAdminChat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  const result = await processAdminChatMessage({ message, history });
  return ApiResponse.success(res, result, "Business insights generated successfully");
});
