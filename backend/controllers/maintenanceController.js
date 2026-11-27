import * as maintenanceService from "../services/maintenanceService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createMaintenance = asyncHandler(async (req, res) => {
  const result = await maintenanceService.createMaintenance(req.body);
  return ApiResponse.created(res, result, "Maintenance record created successfully");
});

export const getMaintenanceList = asyncHandler(async (req, res) => {
  const result = await maintenanceService.getMaintenanceList(req.query);
  return ApiResponse.success(res, result, "Maintenance records retrieved successfully");
});

export const getMaintenanceById = asyncHandler(async (req, res) => {
  const result = await maintenanceService.getMaintenanceById(req.params.id);
  return ApiResponse.success(res, result, "Maintenance record retrieved successfully");
});

export const updateMaintenance = asyncHandler(async (req, res) => {
  const result = await maintenanceService.updateMaintenance(req.params.id, req.body);
  return ApiResponse.success(res, result, "Maintenance record updated successfully");
});

export const startMaintenance = asyncHandler(async (req, res) => {
  const result = await maintenanceService.startMaintenance(req.params.id);
  return ApiResponse.success(res, result, "Maintenance started successfully");
});

export const completeMaintenance = asyncHandler(async (req, res) => {
  const result = await maintenanceService.completeMaintenance(req.params.id, req.body);
  return ApiResponse.success(res, result, "Maintenance completed and equipment released successfully");
});

export const cancelMaintenance = asyncHandler(async (req, res) => {
  const result = await maintenanceService.cancelMaintenance(req.params.id);
  return ApiResponse.success(res, result, "Maintenance cancelled successfully");
});
