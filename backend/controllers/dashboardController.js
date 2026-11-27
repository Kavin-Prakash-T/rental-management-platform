import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as dashboardService from "../services/dashboardService.js";

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getDashboardSummary(req.query);
  return ApiResponse.success(res, summary, "Dashboard summary retrieved successfully");
});

export const getDashboardActivity = asyncHandler(async (req, res) => {
  const activity = await dashboardService.getDashboardActivity(req.query);
  return ApiResponse.success(res, activity, "Dashboard activity retrieved successfully");
});
