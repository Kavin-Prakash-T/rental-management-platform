import * as bookingService from "../services/bookingService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createBooking = asyncHandler(async (req, res) => {
  const idempotencyKey = req.headers["x-idempotency-key"] || req.body.idempotencyKey;
  const bookingData = { ...req.body, idempotencyKey };
  const booking = await bookingService.createBooking(bookingData);
  return ApiResponse.created(res, booking, "Booking created successfully");
});

export const getBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getBookings(req.query);
  return ApiResponse.success(res, result, "Bookings retrieved successfully");
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id);
  return ApiResponse.success(res, booking, "Booking retrieved successfully");
});

export const updateBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateBooking(req.params.id, req.body);
  return ApiResponse.success(res, booking, "Booking updated successfully");
});

export const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.confirmBooking(req.params.id);
  return ApiResponse.success(res, booking, "Booking confirmed and equipment reserved successfully");
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const { cancellationReason } = req.body || {};
  const booking = await bookingService.cancelBooking(req.params.id, cancellationReason);
  return ApiResponse.success(res, booking, "Booking cancelled and equipment reservations released successfully");
});
