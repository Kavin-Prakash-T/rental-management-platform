import transporter from "../config/mail.js";
import NotificationLog from "../models/NotificationLog.js";
import Settings from "../models/Settings.js";
import Booking from "../models/Booking.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import ApiError from "../utils/ApiError.js";
import {
  bookingConfirmationTemplate,
  equipmentIssuedTemplate,
  invoicePdfTemplate,
  paymentReceiptTemplate,
  upcomingReturnReminderTemplate,
  overdueRentalReminderTemplate,
  rentalCompletedTemplate,
} from "../utils/emailTemplates.js";
import { generateInvoicePdfBuffer } from "../utils/invoicePdf.js";
import { generateUpiQrBuffer, buildUpiUri } from "../utils/qrCode.js";

export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

const executeSend = async ({
  recipientEmail,
  recipientName = "",
  notificationType,
  subject,
  html,
  relatedEntity,
  idempotencyKey,
  attachments = [],
  metadata = {},
  force = false,
}) => {
  if (!force && idempotencyKey) {
    const existing = await NotificationLog.findOne({ idempotencyKey, status: "sent" });
    if (existing) {
      return {
        success: true,
        skipped: true,
        reason: "Notification already sent for this event",
        log: existing,
      };
    }
  }

  const cleanEmail = (recipientEmail || "").trim().toLowerCase();

  if (!isValidEmail(cleanEmail)) {
    const log = await NotificationLog.findOneAndUpdate(
      { idempotencyKey },
      {
        recipientEmail: cleanEmail || "invalid-email",
        recipientName,
        notificationType,
        subject,
        status: "failed",
        relatedEntity,
        idempotencyKey,
        $inc: { attempts: 1 },
        lastAttemptAt: new Date(),
        errorDetails: "Invalid or missing recipient email address",
        metadata,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      success: false,
      reason: "Invalid or missing recipient email address",
      log,
    };
  }

  const settings = await Settings.getSettings();
  const fromName = settings.businessName || "RentSphere Event Rentals";
  const fromAddress = process.env.EMAIL_USER || "noreply@rentsphere.com";

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: cleanEmail,
      subject,
      html,
      attachments,
    });

    const log = await NotificationLog.findOneAndUpdate(
      { idempotencyKey },
      {
        recipientEmail: cleanEmail,
        recipientName,
        notificationType,
        subject,
        status: "sent",
        relatedEntity,
        idempotencyKey,
        $inc: { attempts: 1 },
        lastAttemptAt: new Date(),
        errorDetails: null,
        metadata: { ...metadata, messageId: info.messageId },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { success: true, log };
  } catch (err) {
    const log = await NotificationLog.findOneAndUpdate(
      { idempotencyKey },
      {
        recipientEmail: cleanEmail,
        recipientName,
        notificationType,
        subject,
        status: "failed",
        relatedEntity,
        idempotencyKey,
        $inc: { attempts: 1 },
        lastAttemptAt: new Date(),
        errorDetails: err.message || "Failed to dispatch email",
        metadata,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { success: false, error: err.message, log };
  }
};

export const sendBookingConfirmation = async (bookingInput, options = {}) => {
  let booking = bookingInput;
  if (!booking?.customer?.email && booking?._id) {
    booking = await Booking.findById(booking._id);
    if (booking && typeof booking.populate === "function") {
      await booking.populate("customer");
    }
  }

  const customer = booking?.customer || {};
  const settings = await Settings.getSettings();
  const { subject, html } = bookingConfirmationTemplate({
    booking,
    customer,
    business: settings,
  });

  return await executeSend({
    recipientEmail: customer.email,
    recipientName: customer.name,
    notificationType: "booking_confirmation",
    subject,
    html,
    relatedEntity: {
      entityType: "Booking",
      entityId: booking._id,
    },
    idempotencyKey: `booking_confirmation:${booking._id}`,
    metadata: { bookingNumber: booking.bookingNumber },
    force: options.force,
  });
};

export const sendEquipmentIssuedNotification = async (bookingInput, options = {}) => {
  let booking = bookingInput;
  if (!booking?.customer?.email && booking?._id) {
    booking = await Booking.findById(booking._id);
    if (booking && typeof booking.populate === "function") {
      await booking.populate("customer");
    }
  }

  const customer = booking?.customer || {};
  const settings = await Settings.getSettings();
  const { subject, html } = equipmentIssuedTemplate({
    booking,
    customer,
    business: settings,
  });

  return await executeSend({
    recipientEmail: customer.email,
    recipientName: customer.name,
    notificationType: "equipment_issued",
    subject,
    html,
    relatedEntity: {
      entityType: "Booking",
      entityId: booking._id,
    },
    idempotencyKey: `equipment_issued:${booking._id}`,
    metadata: { bookingNumber: booking.bookingNumber },
    force: options.force,
  });
};

export const sendInvoiceEmail = async (invoiceInput, options = {}) => {
  let invoice = invoiceInput;
  if (!invoice?.customer?.email && invoice?._id) {
    invoice = await Invoice.findById(invoice._id);
    if (invoice && typeof invoice.populate === "function") {
      await invoice.populate("booking");
    }
  }

  const customer = invoice?.customer || {};
  const settings = await Settings.getSettings();

  let qrBuffer = null;
  if (settings.upiId && invoice.pricing?.outstandingBalance > 0) {
    try {
      const upiUri = buildUpiUri({
        upiId: settings.upiId,
        displayName: settings.upiDisplayName,
        amountPaise: invoice.pricing.outstandingBalance,
        note: `Invoice ${invoice.invoiceNumber}`,
      });
      qrBuffer = await generateUpiQrBuffer(upiUri);
    } catch {
      qrBuffer = null;
    }
  }

  const pdfBuffer = await generateInvoicePdfBuffer(invoice, qrBuffer);

  const { subject, html } = invoicePdfTemplate({
    invoice,
    customer,
    business: settings,
  });

  return await executeSend({
    recipientEmail: customer.email,
    recipientName: customer.name,
    notificationType: "invoice_generated",
    subject,
    html,
    relatedEntity: {
      entityType: "Invoice",
      entityId: invoice._id,
    },
    idempotencyKey: `invoice_generated:${invoice._id}`,
    attachments: [
      {
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
    metadata: { invoiceNumber: invoice.invoiceNumber },
    force: options.force,
  });
};

export const sendPaymentReceiptEmail = async (paymentInput, options = {}) => {
  let payment = paymentInput;
  if ((!payment?.booking?.customer || !payment?.invoice) && payment?._id) {
    payment = await Payment.findById(payment._id);
    if (payment && typeof payment.populate === "function") {
      await payment.populate({
        path: "booking",
        populate: { path: "customer" },
      });
      await payment.populate("invoice");
    }
  }

  const customer =
    payment.invoice?.customer || payment.booking?.customer || {};
  const settings = await Settings.getSettings();

  const { subject, html } = paymentReceiptTemplate({
    payment,
    invoice: payment.invoice,
    booking: payment.booking,
    customer,
    business: settings,
  });

  return await executeSend({
    recipientEmail: customer.email,
    recipientName: customer.name,
    notificationType: "payment_receipt",
    subject,
    html,
    relatedEntity: {
      entityType: "Payment",
      entityId: payment._id,
    },
    idempotencyKey: `payment_receipt:${payment._id}`,
    metadata: {
      paymentNumber: payment.paymentNumber,
      amount: payment.amount,
    },
    force: options.force,
  });
};

export const sendUpcomingReturnReminder = async (bookingInput, options = {}) => {
  let booking = bookingInput;
  if (!booking?.customer?.email && booking?._id) {
    booking = await Booking.findById(booking._id);
    if (booking && typeof booking.populate === "function") {
      await booking.populate("customer");
    }
  }

  const customer = booking?.customer || {};
  const settings = await Settings.getSettings();
  const { subject, html } = upcomingReturnReminderTemplate({
    booking,
    customer,
    business: settings,
  });

  return await executeSend({
    recipientEmail: customer.email,
    recipientName: customer.name,
    notificationType: "upcoming_return_reminder",
    subject,
    html,
    relatedEntity: {
      entityType: "Booking",
      entityId: booking._id,
    },
    idempotencyKey: options.idempotencyKey || `upcoming_return_reminder:${booking._id}`,
    metadata: { bookingNumber: booking.bookingNumber },
    force: options.force,
  });
};

export const sendOverdueRentalReminder = async (bookingInput, options = {}) => {
  let booking = bookingInput;
  if (!booking?.customer?.email && booking?._id) {
    booking = await Booking.findById(booking._id);
    if (booking && typeof booking.populate === "function") {
      await booking.populate("customer");
    }
  }

  const customer = booking?.customer || {};
  const settings = await Settings.getSettings();
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - new Date(booking.endDate).getTime());
  const overdueDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const { subject, html } = overdueRentalReminderTemplate({
    booking,
    customer,
    business: settings,
    overdueDays,
  });

  return await executeSend({
    recipientEmail: customer.email,
    recipientName: customer.name,
    notificationType: "overdue_rental_reminder",
    subject,
    html,
    relatedEntity: {
      entityType: "Booking",
      entityId: booking._id,
    },
    idempotencyKey: options.idempotencyKey || `overdue_rental_reminder:${booking._id}`,
    metadata: {
      bookingNumber: booking.bookingNumber,
      overdueDays,
    },
    force: options.force,
  });
};

export const sendRentalCompletedNotification = async (bookingInput, options = {}) => {
  let booking = bookingInput;
  if (!booking?.customer?.email && booking?._id) {
    booking = await Booking.findById(booking._id);
    if (booking && typeof booking.populate === "function") {
      await booking.populate("customer");
    }
  }

  const customer = booking?.customer || {};
  const settings = await Settings.getSettings();
  const { subject, html } = rentalCompletedTemplate({
    booking,
    customer,
    business: settings,
  });

  return await executeSend({
    recipientEmail: customer.email,
    recipientName: customer.name,
    notificationType: "rental_completed",
    subject,
    html,
    relatedEntity: {
      entityType: "Booking",
      entityId: booking._id,
    },
    idempotencyKey: `rental_completed:${booking._id}`,
    metadata: { bookingNumber: booking.bookingNumber },
    force: options.force,
  });
};

export const retryNotification = async (logId) => {
  const log = await NotificationLog.findById(logId);
  if (!log) {
    throw ApiError.notFound("Notification record not found");
  }

  const { entityType, entityId } = log.relatedEntity;

  switch (log.notificationType) {
    case "booking_confirmation": {
      const booking = await Booking.findById(entityId);
      if (!booking) throw ApiError.notFound("Associated booking no longer exists");
      if (typeof booking.populate === "function") {
        await booking.populate("customer");
      }
      return await sendBookingConfirmation(booking, { force: true });
    }
    case "equipment_issued": {
      const booking = await Booking.findById(entityId);
      if (!booking) throw ApiError.notFound("Associated booking no longer exists");
      if (typeof booking.populate === "function") {
        await booking.populate("customer");
      }
      return await sendEquipmentIssuedNotification(booking, { force: true });
    }
    case "invoice_generated": {
      const invoice = await Invoice.findById(entityId);
      if (!invoice) throw ApiError.notFound("Associated invoice no longer exists");
      if (typeof invoice.populate === "function") {
        await invoice.populate("booking");
      }
      return await sendInvoiceEmail(invoice, { force: true });
    }
    case "payment_receipt": {
      const payment = await Payment.findById(entityId);
      if (!payment) throw ApiError.notFound("Associated payment no longer exists");
      if (typeof payment.populate === "function") {
        await payment.populate({ path: "booking", populate: { path: "customer" } });
        await payment.populate("invoice");
      }
      return await sendPaymentReceiptEmail(payment, { force: true });
    }
    case "upcoming_return_reminder": {
      const booking = await Booking.findById(entityId);
      if (!booking) throw ApiError.notFound("Associated booking no longer exists");
      if (typeof booking.populate === "function") {
        await booking.populate("customer");
      }
      return await sendUpcomingReturnReminder(booking, { force: true });
    }
    case "overdue_rental_reminder": {
      const booking = await Booking.findById(entityId);
      if (!booking) throw ApiError.notFound("Associated booking no longer exists");
      if (typeof booking.populate === "function") {
        await booking.populate("customer");
      }
      return await sendOverdueRentalReminder(booking, { force: true });
    }
    case "rental_completed": {
      const booking = await Booking.findById(entityId);
      if (!booking) throw ApiError.notFound("Associated booking no longer exists");
      if (typeof booking.populate === "function") {
        await booking.populate("customer");
      }
      return await sendRentalCompletedNotification(booking, { force: true });
    }
    default:
      throw ApiError.badRequest(`Unsupported notification type '${log.notificationType}' for retry`);
  }
};

export const getNotificationLogs = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    notificationType,
    recipientEmail,
    startDate,
    endDate,
  } = filters;

  const query = {};

  if (status) query.status = status;
  if (notificationType) query.notificationType = notificationType;
  if (recipientEmail) {
    query.recipientEmail = { $regex: recipientEmail.trim(), $options: "i" };
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) query.createdAt.$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) query.createdAt.$lte = e;
    }
    if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
  }

  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [logs, total] = await Promise.all([
    NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    NotificationLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

export const getNotificationById = async (id) => {
  const log = await NotificationLog.findById(id).lean();
  if (!log) {
    throw ApiError.notFound("Notification record not found");
  }
  return log;
};
