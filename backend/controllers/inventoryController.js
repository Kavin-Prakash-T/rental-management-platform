import * as inventoryService from "../services/inventoryService.js";
import * as availabilityService from "../services/availabilityService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const checkAvailability = asyncHandler(async (req, res) => {
  const result = await availabilityService.checkAvailability(req.body);
  return ApiResponse.success(res, result, "Equipment availability checked successfully");
});

export const getInventoryOverview = asyncHandler(async (req, res) => {
  const result = await inventoryService.getInventoryOverview(req.query);
  return ApiResponse.success(res, result, "Inventory overview retrieved successfully");
});

export const getOverdueRentals = asyncHandler(async (_req, res) => {
  const result = await inventoryService.getOverdueRentals();
  return ApiResponse.success(res, result, "Overdue rentals retrieved successfully");
});

export const getProductInventoryDetail = asyncHandler(async (req, res) => {
  const result = await inventoryService.getProductInventoryDetail(req.params.productId, req.query);
  return ApiResponse.success(res, result, "Product inventory details retrieved successfully");
});
