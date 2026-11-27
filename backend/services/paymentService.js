import Payment from "../models/Payment.js";
import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";
import ApiError from "../utils/ApiError.js";
import { withInventoryTransaction } from "./availabilityService.js";

export const generatePaymentNumber = async (prefix = "PAY") => {
  const cleanPrefix = (prefix || "PAY").trim().toUpperCase();
  const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
  let paymentNumber = "";
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    paymentNumber = `${cleanPrefix}-${yearMonth}-${randomPart}`;
    exists = await Payment.findOne({ paymentNumber });
    attempts++;
  }

  return paymentNumber;
};

export const createPayment = async (paymentData, adminId) => {
  if (paymentData.idempotencyKey) {
    const existingPayment = await Payment.findOne({
      idempotencyKey: paymentData.idempotencyKey,
    })
      .populate("booking")
      .populate("invoice");

    if (existingPayment) {
      return existingPayment;
    }
  }

  if (paymentData.transactionReference && paymentData.transactionReference.trim()) {
    const existingRef = await Payment.findOne({
      transactionReference: paymentData.transactionReference.trim(),
      booking: paymentData.booking,
      status: "verified",
    });

    if (existingRef) {
      throw ApiError.conflict(
        `Payment with transaction reference '${paymentData.transactionReference}' already exists for this booking`
      );
    }
  }

  const booking = await Booking.findById(paymentData.booking);
  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }

  if (booking.status === "cancelled") {
    throw ApiError.badRequest("Cannot record payment for a cancelled booking");
  }

  let targetInvoiceId = paymentData.invoice || null;
  let activeInvoice = null;

  if (targetInvoiceId) {
    activeInvoice = await Invoice.findById(targetInvoiceId);
    if (!activeInvoice) {
      throw ApiError.notFound("Invoice not found");
    }
    if (activeInvoice.booking.toString() !== booking._id.toString()) {
      throw ApiError.badRequest("Invoice does not belong to the specified booking");
    }
    if (activeInvoice.status === "cancelled") {
      throw ApiError.badRequest("Cannot apply payment towards a cancelled invoice");
    }
    if (paymentData.amount > activeInvoice.pricing.outstandingBalance) {
      throw ApiError.badRequest(
        `Payment amount (${paymentData.amount} paise) exceeds outstanding invoice balance (${activeInvoice.pricing.outstandingBalance} paise)`
      );
    }
  } else {
    activeInvoice = await Invoice.findOne({
      booking: booking._id,
      status: { $nin: ["cancelled", "paid"] },
    });

    if (activeInvoice) {
      targetInvoiceId = activeInvoice._id;
      if (paymentData.amount > activeInvoice.pricing.outstandingBalance) {
        throw ApiError.badRequest(
          `Payment amount (${paymentData.amount} paise) exceeds outstanding invoice balance (${activeInvoice.pricing.outstandingBalance} paise)`
        );
      }
    }
  }

  return await withInventoryTransaction(async (session) => {
    let invToUpdate = null;
    if (targetInvoiceId) {
      invToUpdate = await Invoice.findById(targetInvoiceId).session(session);
      if (!invToUpdate) {
        throw ApiError.notFound("Invoice not found");
      }
      if (paymentData.amount > invToUpdate.pricing.outstandingBalance) {
        throw ApiError.badRequest(
          `Payment amount (${paymentData.amount} paise) exceeds outstanding invoice balance (${invToUpdate.pricing.outstandingBalance} paise)`
        );
      }
    }

    const paymentNumber = await generatePaymentNumber("PAY");

    const [payment] = await Payment.create(
      [
        {
          paymentNumber,
          booking: booking._id,
          invoice: targetInvoiceId,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          transactionReference: paymentData.transactionReference?.trim() || "",
          paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
          purpose: paymentData.purpose || "rental",
          status: "verified",
          verifiedBy: adminId || null,
          originalPayment: null,
          notes: paymentData.notes?.trim() || "",
          idempotencyKey: paymentData.idempotencyKey?.trim() || undefined,
        },
      ],
      { session }
    );

    if (invToUpdate) {
      invToUpdate.pricing.totalPaid += paymentData.amount;
      invToUpdate.pricing.outstandingBalance = Math.max(
        0,
        invToUpdate.pricing.totalInvoiceAmount - invToUpdate.pricing.totalPaid
      );

      if (invToUpdate.pricing.outstandingBalance === 0) {
        invToUpdate.status = "paid";
      } else if (invToUpdate.pricing.totalPaid > 0) {
        invToUpdate.status = "partially_paid";
      }

      await invToUpdate.save({ session });
    }

    return await Payment.findById(payment._id)
      .populate("booking")
      .populate("invoice")
      .populate("verifiedBy", "name email")
      .session(session);
  });
};

export const getPayments = async (filters = {}) => {
  const {
    booking,
    invoice,
    paymentMethod,
    purpose,
    status,
    search,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const query = {};

  if (booking) {
    query.booking = booking;
  }

  if (invoice) {
    query.invoice = invoice;
  }

  if (paymentMethod) {
    query.paymentMethod = paymentMethod;
  }

  if (purpose) {
    query.purpose = purpose;
  }

  if (status) {
    query.status = status;
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { paymentNumber: regex },
      { transactionReference: regex },
      { notes: regex },
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate("booking", "bookingNumber startDate endDate total rentalStatus")
      .populate("invoice", "invoiceNumber status pricing")
      .populate("verifiedBy", "name email")
      .populate("originalPayment", "paymentNumber amount purpose")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(query),
  ]);

  return {
    payments,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getPaymentById = async (id) => {
  const payment = await Payment.findById(id)
    .populate("booking")
    .populate("invoice")
    .populate("verifiedBy", "name email")
    .populate("originalPayment");

  if (!payment) {
    throw ApiError.notFound("Payment not found");
  }

  return payment;
};

export const getPaymentsByInvoiceId = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId)
    .populate("booking")
    .populate("customer.customerId");

  if (!invoice) {
    throw ApiError.notFound("Invoice not found");
  }

  const payments = await Payment.find({ invoice: invoiceId })
    .populate("verifiedBy", "name email")
    .populate("originalPayment", "paymentNumber amount purpose status")
    .sort({ createdAt: -1 });

  return {
    invoice,
    payments,
    summary: {
      totalInvoiceAmount: invoice.pricing.totalInvoiceAmount,
      totalPaid: invoice.pricing.totalPaid,
      outstandingBalance: invoice.pricing.outstandingBalance,
      refundableDeposit: invoice.pricing.refundableDeposit,
      paymentCount: payments.length,
    },
  };
};

export const refundDeposit = async (paymentId, refundData = {}, adminId) => {
  const originalPayment = await Payment.findById(paymentId);
  if (!originalPayment) {
    throw ApiError.notFound("Payment not found");
  }

  if (originalPayment.purpose !== "deposit") {
    throw ApiError.badRequest("Only payments with purpose 'deposit' can be refunded");
  }

  if (originalPayment.status !== "verified") {
    throw ApiError.badRequest(`Cannot refund a payment with status '${originalPayment.status}'`);
  }

  const priorRefunds = await Payment.find({
    originalPayment: originalPayment._id,
    purpose: "refund",
    status: "verified",
  });

  const totalRefundedSoFar = priorRefunds.reduce((sum, p) => sum + p.amount, 0);
  const remainingRefundable = originalPayment.amount - totalRefundedSoFar;

  if (remainingRefundable <= 0) {
    throw ApiError.badRequest("Deposit has already been fully refunded");
  }

  const refundAmount = refundData.amount !== undefined ? refundData.amount : remainingRefundable;

  if (refundAmount > remainingRefundable) {
    throw ApiError.badRequest(
      `Refund amount (${refundAmount} paise) exceeds remaining refundable deposit (${remainingRefundable} paise)`
    );
  }

  return await withInventoryTransaction(async (session) => {
    const paymentNumber = await generatePaymentNumber("REF");

    const [refundRecord] = await Payment.create(
      [
        {
          paymentNumber,
          booking: originalPayment.booking,
          invoice: originalPayment.invoice,
          amount: refundAmount,
          paymentMethod: refundData.paymentMethod || originalPayment.paymentMethod,
          transactionReference: refundData.transactionReference?.trim() || "",
          paymentDate: new Date(),
          purpose: "refund",
          status: "verified",
          verifiedBy: adminId || null,
          originalPayment: originalPayment._id,
          notes: refundData.notes?.trim() || `Refund for deposit ${originalPayment.paymentNumber}`,
        },
      ],
      { session }
    );

    if (totalRefundedSoFar + refundAmount >= originalPayment.amount) {
      originalPayment.status = "refunded";
      await originalPayment.save({ session });
    }

    return await Payment.findById(refundRecord._id)
      .populate("booking")
      .populate("invoice")
      .populate("originalPayment")
      .populate("verifiedBy", "name email")
      .session(session);
  });
};

export const reversePayment = async (paymentId, reversalData = {}, adminId) => {
  const targetPayment = await Payment.findById(paymentId);
  if (!targetPayment) {
    throw ApiError.notFound("Payment not found");
  }

  if (targetPayment.status !== "verified") {
    throw ApiError.badRequest(`Cannot reverse payment with status '${targetPayment.status}'`);
  }

  if (["refund", "reversal"].includes(targetPayment.purpose)) {
    throw ApiError.badRequest(`Cannot reverse a payment record with purpose '${targetPayment.purpose}'`);
  }

  return await withInventoryTransaction(async (session) => {
    targetPayment.status = "reversed";
    await targetPayment.save({ session });

    const paymentNumber = await generatePaymentNumber("REV");

    const [reversalRecord] = await Payment.create(
      [
        {
          paymentNumber,
          booking: targetPayment.booking,
          invoice: targetPayment.invoice,
          amount: targetPayment.amount,
          paymentMethod: targetPayment.paymentMethod,
          transactionReference: targetPayment.transactionReference || "",
          paymentDate: new Date(),
          purpose: "reversal",
          status: "verified",
          verifiedBy: adminId || null,
          originalPayment: targetPayment._id,
          notes: reversalData.notes?.trim() || reversalData.reason?.trim() || `Reversal of payment ${targetPayment.paymentNumber}`,
        },
      ],
      { session }
    );

    if (targetPayment.invoice) {
      const inv = await Invoice.findById(targetPayment.invoice).session(session);
      if (inv) {
        inv.pricing.totalPaid = Math.max(0, inv.pricing.totalPaid - targetPayment.amount);
        inv.pricing.outstandingBalance = Math.max(
          0,
          inv.pricing.totalInvoiceAmount - inv.pricing.totalPaid
        );

        if (inv.pricing.outstandingBalance === 0) {
          inv.status = "paid";
        } else if (inv.pricing.totalPaid > 0) {
          inv.status = "partially_paid";
        } else {
          inv.status = "issued";
        }

        await inv.save({ session });
      }
    }

    return await Payment.findById(reversalRecord._id)
      .populate("booking")
      .populate("invoice")
      .populate("originalPayment")
      .populate("verifiedBy", "name email")
      .session(session);
  });
};
