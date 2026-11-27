import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as reportService from "../services/reportService.js";

export const getRevenueReport = asyncHandler(async (req, res) => {
  const data = await reportService.getRevenueReport(req.query);
  return ApiResponse.success(res, data, "Revenue report generated successfully");
});

export const getExpenseReport = asyncHandler(async (req, res) => {
  const data = await reportService.getExpenseReport(req.query);
  return ApiResponse.success(res, data, "Expense report generated successfully");
});

export const getProfitReport = asyncHandler(async (req, res) => {
  const data = await reportService.getProfitReport(req.query);
  return ApiResponse.success(res, data, "Profit report generated successfully");
});

export const getProductReport = asyncHandler(async (req, res) => {
  const data = await reportService.getProductReport(req.query);
  return ApiResponse.success(res, data, "Product performance report generated successfully");
});

export const getUtilizationReport = asyncHandler(async (req, res) => {
  const data = await reportService.getUtilizationReport(req.query);
  return ApiResponse.success(res, data, "Equipment utilization report generated successfully");
});

export const getCustomerReport = asyncHandler(async (req, res) => {
  const data = await reportService.getCustomerReport(req.query);
  return ApiResponse.success(res, data, "Customer rental report generated successfully");
});

export const getOutstandingReport = asyncHandler(async (req, res) => {
  const data = await reportService.getOutstandingReport(req.query);
  return ApiResponse.success(res, data, "Outstanding payments report generated successfully");
});

export const getMaintenanceReport = asyncHandler(async (req, res) => {
  const data = await reportService.getMaintenanceReport(req.query);
  return ApiResponse.success(res, data, "Maintenance report generated successfully");
});

export const exportReportCsv = asyncHandler(async (req, res) => {
  const { type = "revenue" } = req.query;
  const csv = await reportService.generateReportCsv(type, req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="RentSphere-${type}-report-${Date.now()}.csv"`
  );
  return res.status(200).send(csv);
});
