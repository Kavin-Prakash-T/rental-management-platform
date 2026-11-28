import * as bookingService from "../services/bookingService.js";
import * as emailService from "../services/emailService.js";
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

export const getBookingCalendar = asyncHandler(async (req, res) => {
  const result = await bookingService.getBookingCalendar(req.query);
  return ApiResponse.success(res, result, "Booking calendar retrieved successfully");
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
  await emailService.sendBookingConfirmation(booking);
  return ApiResponse.success(res, booking, "Booking confirmed and equipment reserved successfully");
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const { cancellationReason } = req.body || {};
  const booking = await bookingService.cancelBooking(req.params.id, cancellationReason);
  return ApiResponse.success(res, booking, "Booking cancelled and equipment reservations released successfully");
});

export const issueBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.issueBooking(req.params.id, req.body);
  await emailService.sendEquipmentIssuedNotification(booking);
  return ApiResponse.success(res, booking, "Equipment issued successfully");
});

export const returnBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.returnBooking(req.params.id, req.body);
  if (booking.status === "completed") {
    await emailService.sendRentalCompletedNotification(booking);
  }
  return ApiResponse.success(res, booking, "Equipment return recorded successfully");
});
