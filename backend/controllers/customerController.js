import * as customerService from "../services/customerService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body);
  return ApiResponse.created(res, customer, "Customer created successfully");
});

export const getCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomers(req.query);
  return ApiResponse.success(res, result, "Customers retrieved successfully");
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.id);
  return ApiResponse.success(res, customer, "Customer retrieved successfully");
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  return ApiResponse.success(res, customer, "Customer updated successfully");
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.deleteCustomer(req.params.id);
  return ApiResponse.success(res, customer, "Customer deactivated successfully");
});
