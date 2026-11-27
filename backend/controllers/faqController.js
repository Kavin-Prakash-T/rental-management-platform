import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as faqService from "../services/faqService.js";

export const createFaq = asyncHandler(async (req, res) => {
  const faq = await faqService.createFaq(req.body);
  return ApiResponse.created(res, faq, "FAQ created successfully");
});

export const getFaqs = asyncHandler(async (req, res) => {
  const isAdmin = Boolean(req.admin);
  const result = await faqService.getFaqs(req.query, isAdmin);
  return ApiResponse.success(res, result, "FAQs retrieved successfully");
});

export const getFaqById = asyncHandler(async (req, res) => {
  const isAdmin = Boolean(req.admin);
  const faq = await faqService.getFaqById(req.params.id, isAdmin);
  return ApiResponse.success(res, faq, "FAQ retrieved successfully");
});

export const updateFaq = asyncHandler(async (req, res) => {
  const faq = await faqService.updateFaq(req.params.id, req.body);
  return ApiResponse.success(res, faq, "FAQ updated successfully");
});

export const deleteFaq = asyncHandler(async (req, res) => {
  const faq = await faqService.deactivateFaq(req.params.id);
  return ApiResponse.success(res, faq, "FAQ deactivated successfully");
});
