import * as availabilityService from "../services/availabilityService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const checkAvailability = asyncHandler(async (req, res) => {
  const result = await availabilityService.checkAvailability(req.body);
  return ApiResponse.success(res, result, "Equipment availability checked successfully");
});
