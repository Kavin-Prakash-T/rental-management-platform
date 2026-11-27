import * as invoiceService from "../services/invoiceService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const generateInvoice = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.generateInvoiceFromBooking(req.params.bookingId, req.body);
  return ApiResponse.created(res, invoice, "Invoice generated successfully");
});

export const getInvoices = asyncHandler(async (req, res) => {
  const result = await invoiceService.getInvoices(req.query);
  return ApiResponse.success(res, result, "Invoices retrieved successfully");
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id);
  return ApiResponse.success(res, invoice, "Invoice retrieved successfully");
});

export const getInvoicePdf = asyncHandler(async (req, res) => {
  const { buffer, invoiceNumber } = await invoiceService.getInvoicePdf(req.params.id);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="Invoice-${invoiceNumber}.pdf"`);
  res.setHeader("Content-Length", buffer.length);
  return res.end(buffer);
});

export const getInvoiceQr = asyncHandler(async (req, res) => {
  const result = await invoiceService.getInvoiceQr(req.params.id);
  return ApiResponse.success(res, result, "UPI QR code generated successfully");
});

export const cancelInvoice = asyncHandler(async (req, res) => {
  const { cancellationReason } = req.body || {};
  const invoice = await invoiceService.cancelInvoice(req.params.id, cancellationReason);
  return ApiResponse.success(res, invoice, "Invoice cancelled successfully");
});
