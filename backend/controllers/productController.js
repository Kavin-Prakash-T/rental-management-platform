import * as productService from "../services/productService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  return ApiResponse.created(res, product, "Product created successfully");
});

export const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query);
  return ApiResponse.success(res, result, "Products retrieved successfully");
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  return ApiResponse.success(res, product, "Product retrieved successfully");
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  return ApiResponse.success(res, product, "Product updated successfully");
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.params.id);
  return ApiResponse.success(res, result.product, result.message);
});
