import * as categoryService from "../services/categoryService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return ApiResponse.created(res, category, "Category created successfully");
});

export const getCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.getCategories(req.query);
  return ApiResponse.success(res, result, "Categories retrieved successfully");
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  return ApiResponse.success(res, category, "Category retrieved successfully");
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return ApiResponse.success(res, category, "Category updated successfully");
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.deleteCategory(req.params.id);
  return ApiResponse.success(res, result.category, result.message);
});
