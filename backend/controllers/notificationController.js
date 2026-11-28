import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import * as emailService from "../services/emailService.js";
import Booking from "../models/Booking.js";
import ApiError from "../utils/ApiError.js";

export const getNotificationLogs = asyncHandler(async (req, res) => {
  const result = await emailService.getNotificationLogs(req.query);
  return ApiResponse.success(res, result, "Notification logs retrieved successfully");
});

export const getNotificationById = asyncHandler(async (req, res) => {
  const log = await emailService.getNotificationById(req.params.id);
  return ApiResponse.success(res, log, "Notification log details retrieved successfully");
});

export const retryNotification = asyncHandler(async (req, res) => {
  const result = await emailService.retryNotification(req.params.id);
  return ApiResponse.success(res, result, "Notification retry executed");
});

export const sendReturnReminder = asyncHandler(async (req, res) => {
  let booking = await Booking.findById(req.params.bookingId);
  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }
  if (typeof booking.populate === "function") {
    await booking.populate("customer");
  }

  const result = await emailService.sendUpcomingReturnReminder(booking, { force: true });
  return ApiResponse.success(res, result, "Upcoming return reminder dispatched");
});
