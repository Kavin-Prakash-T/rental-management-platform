import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as paymentService from "../services/paymentService.js";
import * as emailService from "../services/emailService.js";

export const createPayment = asyncHandler(async (req, res) => {
  const adminId = req.admin?._id || req.adminId || req.user?._id;
  const payment = await paymentService.createPayment(req.body, adminId);
  await emailService.sendPaymentReceiptEmail(payment);
  return ApiResponse.created(res, payment, "Payment recorded successfully");
});

export const getPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getPayments(req.query);
  return ApiResponse.success(res, result, "Payments retrieved successfully");
});

export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);
  return ApiResponse.success(res, payment, "Payment details retrieved successfully");
});

export const getPaymentsByInvoice = asyncHandler(async (req, res) => {
  const data = await paymentService.getPaymentsByInvoiceId(req.params.invoiceId);
  return ApiResponse.success(res, data, "Invoice payments retrieved successfully");
});

export const refundPayment = asyncHandler(async (req, res) => {
  const adminId = req.admin?._id || req.adminId || req.user?._id;
  const refund = await paymentService.refundDeposit(req.params.id, req.body, adminId);
  return ApiResponse.success(res, refund, "Deposit refunded successfully");
});

export const reversePayment = asyncHandler(async (req, res) => {
  const adminId = req.admin?._id || req.adminId || req.user?._id;
  const reversal = await paymentService.reversePayment(req.params.id, req.body, adminId);
  return ApiResponse.success(res, reversal, "Payment reversed successfully");
});
