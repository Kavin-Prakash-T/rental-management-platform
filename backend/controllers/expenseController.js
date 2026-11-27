import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as expenseService from "../services/expenseService.js";

export const createExpense = asyncHandler(async (req, res) => {
  const adminId = req.admin?._id || req.adminId || req.user?._id;
  const expense = await expenseService.createExpense(req.body, adminId);
  return ApiResponse.created(res, expense, "Expense recorded successfully");
});

export const getExpenses = asyncHandler(async (req, res) => {
  const result = await expenseService.getExpenses(req.query);
  return ApiResponse.success(res, result, "Expenses retrieved successfully");
});

export const getExpenseSummary = asyncHandler(async (req, res) => {
  const summary = await expenseService.getExpenseSummary(req.query);
  return ApiResponse.success(res, summary, "Expense summary retrieved successfully");
});

export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(req.params.id);
  return ApiResponse.success(res, expense, "Expense details retrieved successfully");
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(req.params.id, req.body);
  return ApiResponse.success(res, expense, "Expense updated successfully");
});

export const voidExpense = asyncHandler(async (req, res) => {
  const adminId = req.admin?._id || req.adminId || req.user?._id;
  const { reason = "Voided by admin" } = req.body || {};
  const expense = await expenseService.voidExpense(req.params.id, reason, adminId);
  return ApiResponse.success(res, expense, "Expense voided successfully");
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const adminId = req.admin?._id || req.adminId || req.user?._id;
  const reason = req.body?.reason || req.query?.reason || "Expense voided via delete endpoint";
  const expense = await expenseService.voidExpense(req.params.id, reason, adminId);
  return ApiResponse.success(res, expense, "Expense safely voided and archived");
});
