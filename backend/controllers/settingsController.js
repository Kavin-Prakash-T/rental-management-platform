import * as settingsService from "../services/settingsService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await settingsService.getSettings();
  return ApiResponse.success(res, settings, "Settings retrieved successfully");
});

export const getPublicSettings = asyncHandler(async (_req, res) => {
  const publicSettings = await settingsService.getPublicSettings();
  return ApiResponse.success(res, publicSettings, "Public settings retrieved successfully");
});

export const updateSettings = asyncHandler(async (req, res) => {
  const updatedSettings = await settingsService.updateSettings(req.body);
  return ApiResponse.success(res, updatedSettings, "Settings updated successfully");
});
