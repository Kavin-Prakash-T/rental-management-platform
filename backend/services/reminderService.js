import Booking from "../models/Booking.js";
import NotificationLog from "../models/NotificationLog.js";
import {
  sendUpcomingReturnReminder,
  sendOverdueRentalReminder,
  isValidEmail,
} from "./emailService.js";

const getKolkataDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export const processAutomatedRentalReminders = async ({ batchSize = 25 } = {}) => {
  const limit = Math.max(1, Math.min(100, parseInt(batchSize, 10) || 25));
  const now = new Date();
  const kolkataDateStr = getKolkataDateString(now);

  const upcomingWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [upcomingBookings, overdueBookings] = await Promise.all([
    Booking.find({
      status: "issued",
      endDate: { $gte: now, $lte: upcomingWindowEnd },
    })
      .populate("customer")
      .limit(limit)
      .lean(),
    Booking.find({
      status: "issued",
      endDate: { $lt: now },
    })
      .populate("customer")
      .limit(limit)
      .lean(),
  ]);

  const summary = {
    executedAt: now.toISOString(),
    kolkataDate: kolkataDateStr,
    upcomingFound: upcomingBookings.length,
    overdueFound: overdueBookings.length,
    upcomingSent: 0,
    upcomingSkippedDuplicate: 0,
    upcomingSkippedNoEmail: 0,
    upcomingFailed: 0,
    overdueSent: 0,
    overdueSkippedDuplicate: 0,
    overdueSkippedNoEmail: 0,
    overdueFailed: 0,
    details: [],
  };

  for (const booking of upcomingBookings) {
    const customer = booking.customer || {};
    const idempotencyKey = `upcoming_return_reminder:${booking._id}:${kolkataDateStr}`;

    if (!isValidEmail(customer.email)) {
      summary.upcomingSkippedNoEmail += 1;
      summary.details.push({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        type: "upcoming",
        status: "skipped_no_email",
        customerEmail: customer.email || null,
      });
      continue;
    }

    const alreadySent = await NotificationLog.findOne({
      idempotencyKey,
      status: "sent",
    });

    if (alreadySent) {
      summary.upcomingSkippedDuplicate += 1;
      summary.details.push({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        type: "upcoming",
        status: "skipped_duplicate",
        idempotencyKey,
      });
      continue;
    }

    try {
      const result = await sendUpcomingReturnReminder(booking, {
        idempotencyKey,
      });

      if (result.skipped) {
        summary.upcomingSkippedDuplicate += 1;
        summary.details.push({
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          type: "upcoming",
          status: "skipped_duplicate",
          idempotencyKey,
        });
      } else if (result.success) {
        summary.upcomingSent += 1;
        summary.details.push({
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          type: "upcoming",
          status: "sent",
          logId: result.log?._id,
        });
      } else {
        summary.upcomingFailed += 1;
        summary.details.push({
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          type: "upcoming",
          status: "failed",
          error: result.error,
          logId: result.log?._id,
        });
      }
    } catch (err) {
      summary.upcomingFailed += 1;
      summary.details.push({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        type: "upcoming",
        status: "failed",
        error: err.message,
      });
    }
  }

  for (const booking of overdueBookings) {
    const customer = booking.customer || {};
    const idempotencyKey = `overdue_rental_reminder:${booking._id}:${kolkataDateStr}`;

    if (!isValidEmail(customer.email)) {
      summary.overdueSkippedNoEmail += 1;
      summary.details.push({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        type: "overdue",
        status: "skipped_no_email",
        customerEmail: customer.email || null,
      });
      continue;
    }

    const alreadySent = await NotificationLog.findOne({
      idempotencyKey,
      status: "sent",
    });

    if (alreadySent) {
      summary.overdueSkippedDuplicate += 1;
      summary.details.push({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        type: "overdue",
        status: "skipped_duplicate",
        idempotencyKey,
      });
      continue;
    }

    try {
      const result = await sendOverdueRentalReminder(booking, {
        idempotencyKey,
      });

      if (result.skipped) {
        summary.overdueSkippedDuplicate += 1;
        summary.details.push({
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          type: "overdue",
          status: "skipped_duplicate",
          idempotencyKey,
        });
      } else if (result.success) {
        summary.overdueSent += 1;
        summary.details.push({
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          type: "overdue",
          status: "sent",
          logId: result.log?._id,
        });
      } else {
        summary.overdueFailed += 1;
        summary.details.push({
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          type: "overdue",
          status: "failed",
          error: result.error,
          logId: result.log?._id,
        });
      }
    } catch (err) {
      summary.overdueFailed += 1;
      summary.details.push({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        type: "overdue",
        status: "failed",
        error: err.message,
      });
    }
  }

  return summary;
};
