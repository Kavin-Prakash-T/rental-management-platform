import * as transportService from "../services/transportService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createTransport = asyncHandler(async (req, res) => {
  const result = await transportService.createTransport(req.body);
  return ApiResponse.created(res, result, "Transportation record created successfully");
});

export const getTransports = asyncHandler(async (req, res) => {
  const result = await transportService.getTransports(req.query);
  return ApiResponse.success(res, result, "Transportation records retrieved successfully");
});

export const getTransportById = asyncHandler(async (req, res) => {
  const result = await transportService.getTransportById(req.params.id);
  return ApiResponse.success(res, result, "Transportation record retrieved successfully");
});

export const updateTransport = asyncHandler(async (req, res) => {
  const result = await transportService.updateTransport(req.params.id, req.body);
  return ApiResponse.success(res, result, "Transportation record updated successfully");
});

export const cancelTransport = asyncHandler(async (req, res) => {
  const { cancellationNotes } = req.body || {};
  const result = await transportService.cancelTransport(req.params.id, cancellationNotes);
  return ApiResponse.success(res, result, "Transportation cancelled successfully");
});

export const updateTransportStatus = asyncHandler(async (req, res) => {
  const result = await transportService.updateTransportStatus(req.params.id, req.body);
  return ApiResponse.success(res, result, "Transportation status updated successfully");
});
