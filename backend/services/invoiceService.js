import Invoice from "../models/Invoice.js";
import Booking from "../models/Booking.js";
import Settings from "../models/Settings.js";
import Transport from "../models/Transport.js";
import Payment from "../models/Payment.js";
import ApiError from "../utils/ApiError.js";
import { generateInvoicePdfBuffer } from "../utils/invoicePdf.js";
import {
  buildUpiUri,
  generateUpiQrBuffer,
  generateUpiQrDataUrl,
} from "../utils/qrCode.js";

export const generateInvoiceNumber = async (prefix = "INV") => {
  const cleanPrefix = (prefix || "INV").trim().toUpperCase();
  const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
  let invoiceNumber = "";
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    invoiceNumber = `${cleanPrefix}-${yearMonth}-${randomPart}`;
    exists = await Invoice.findOne({ invoiceNumber });
    attempts++;
  }

  return invoiceNumber;
};

export const generateInvoiceFromBooking = async (bookingId, options = {}) => {
  const booking = await Booking.findById(bookingId).populate("customer");
  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }

  if (!["confirmed", "issued", "completed"].includes(booking.status)) {
    throw ApiError.badRequest(
      `Cannot generate invoice for booking in '${booking.status}' status. Booking must be confirmed, issued, or completed.`
    );
  }

  const existingInvoice = await Invoice.findOne({
    booking: booking._id,
    status: { $ne: "cancelled" },
  });

  if (existingInvoice && !options.forceRevision) {
    throw ApiError.conflict(
      `Invoice '${existingInvoice.invoiceNumber}' already exists for booking ${booking.bookingNumber}. Cancel existing invoice to generate a new one.`
    );
  }

  const [settings, transport] = await Promise.all([
    Settings.findOne(),
    Transport.findOne({ booking: booking._id, status: { $ne: "cancelled" } }),
  ]);

  const invoiceNumber = await generateInvoiceNumber(settings?.invoicePrefix || "INV");

  const equipmentSubtotal = booking.subtotal || 0;
  const discount = booking.discount || 0;
  const taxableAmount = Math.max(0, equipmentSubtotal - discount);

  const tax = {
    rate: booking.tax?.rate || 18,
    cgst: booking.tax?.cgst || 0,
    sgst: booking.tax?.sgst || 0,
    igst: booking.tax?.igst || 0,
    totalTax: booking.tax?.totalTax || 0,
  };

  const rentalRevenue = taxableAmount + tax.totalTax;

  let transportation = {
    required: false,
    serviceType: "none",
    passThroughCost: 0,
    arrangementFee: 0,
    paymentResponsibility: "none",
    totalCharged: 0,
  };

  if (transport) {
    const passThroughCost =
      transport.paymentResponsibility === "shop_collected"
        ? transport.transportationCost || 0
        : 0;
    const arrangementFee = transport.arrangementFee || 0;
    transportation = {
      required: true,
      serviceType: transport.serviceType || "delivery",
      passThroughCost,
      arrangementFee,
      paymentResponsibility: transport.paymentResponsibility,
      totalCharged: passThroughCost + arrangementFee,
    };
  } else if (booking.transportation?.required) {
    transportation = {
      required: true,
      serviceType: booking.transportation.type || "delivery",
      passThroughCost: 0,
      arrangementFee: booking.transportation.fee || 0,
      paymentResponsibility: "shop_collected",
      totalCharged: booking.transportation.fee || 0,
    };
  }

  const refundableDeposit = booking.refundableDeposit || 0;
  const totalInvoiceAmount = rentalRevenue + transportation.totalCharged + refundableDeposit;

  const existingPayments = await Payment.find({
    booking: booking._id,
    status: "verified",
    purpose: { $in: ["advance", "rental", "deposit"] },
  });
  const totalPaid = existingPayments.reduce((acc, p) => acc + p.amount, 0);
  const outstandingBalance = Math.max(0, totalInvoiceAmount - totalPaid);
  const invoiceStatus = outstandingBalance === 0 ? "paid" : totalPaid > 0 ? "partially_paid" : "issued";

  const items = booking.items.map((it) => ({
    product: it.product,
    name: it.name,
    sku: it.sku,
    quantity: it.quantity,
    dailyRate: it.rateSnapshot?.dailyRate || 0,
    hourlyRate: it.rateSnapshot?.hourlyRate || 0,
    appliedRate: it.rateSnapshot?.appliedRate || it.unitPrice || 0,
    subtotal: it.subtotal,
  }));

  const invoice = await Invoice.create({
    invoiceNumber,
    booking: booking._id,
    customer: {
      customerId: booking.customer?._id,
      name: booking.customer?.name || "Customer",
      phone: booking.customer?.phone || "",
      email: booking.customer?.email || "",
      address: booking.customer?.address || {},
    },
    businessDetails: {
      name: settings?.businessName || "RentSphere Event Rentals",
      address: settings?.address || {},
      phone: settings?.phone || "",
      email: settings?.email || "",
      gstin: settings?.taxConfig?.gstin || "",
      upiId: settings?.upiId || "",
      upiDisplayName: settings?.upiDisplayName || "RentSphere",
    },
    rentalPeriod: {
      startDate: booking.startDate,
      endDate: booking.endDate,
      duration: booking.duration || 1,
      rentalType: booking.rentalType || "daily",
    },
    items,
    pricing: {
      equipmentSubtotal,
      discount,
      taxableAmount,
      tax,
      rentalRevenue,
      transportation,
      refundableDeposit,
      totalInvoiceAmount,
      totalPaid,
      outstandingBalance,
    },
    status: invoiceStatus,
    notes: booking.notes || "",
  });

  if (existingPayments.length > 0) {
    await Payment.updateMany(
      { _id: { $in: existingPayments.map((p) => p._id) }, invoice: null },
      { invoice: invoice._id }
    );
  }

  return invoice;
};

export const getInvoices = async (filters = {}) => {
  const {
    booking,
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

  if (status) {
    query.status = status;
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { invoiceNumber: regex },
      { "customer.name": regex },
      { "customer.phone": regex },
    ];
  }

  const sort = {};
  const validSortFields = ["createdAt", "invoiceNumber", "status"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  sort[sortField] = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate("booking", "bookingNumber startDate endDate")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments(query),
  ]);

  return {
    invoices,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getInvoiceById = async (id) => {
  const invoice = await Invoice.findById(id).populate("booking");
  if (!invoice) {
    throw ApiError.notFound("Invoice not found");
  }
  return invoice;
};

export const getInvoicePdf = async (id) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw ApiError.notFound("Invoice not found");
  }

  let qrBuffer = null;
  const upiId = invoice.businessDetails?.upiId;

  if (upiId) {
    const payablePaise =
      invoice.pricing?.outstandingBalance > 0
        ? invoice.pricing.outstandingBalance
        : invoice.pricing?.totalInvoiceAmount || 0;

    const upiUri = buildUpiUri({
      upiId,
      displayName: invoice.businessDetails?.upiDisplayName || "RentSphere",
      amountPaise: payablePaise,
      note: invoice.invoiceNumber,
    });

    qrBuffer = await generateUpiQrBuffer(upiUri);
  }

  const pdfBuffer = await generateInvoicePdfBuffer(invoice, qrBuffer);

  return {
    buffer: pdfBuffer,
    invoiceNumber: invoice.invoiceNumber,
  };
};

export const getInvoiceQr = async (id) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw ApiError.notFound("Invoice not found");
  }

  let upiId = invoice.businessDetails?.upiId;
  let upiDisplayName = invoice.businessDetails?.upiDisplayName;

  if (!upiId) {
    const settings = await Settings.findOne();
    upiId = settings?.upiId || "";
    upiDisplayName = settings?.upiDisplayName || "RentSphere";
  }

  if (!upiId) {
    throw ApiError.badRequest("UPI payment is not configured in business settings");
  }

  const payablePaise =
    invoice.pricing?.outstandingBalance > 0
      ? invoice.pricing.outstandingBalance
      : invoice.pricing?.totalInvoiceAmount || 0;

  const upiUri = buildUpiUri({
    upiId,
    displayName: upiDisplayName || "RentSphere",
    amountPaise: payablePaise,
    note: invoice.invoiceNumber,
  });

  const qrCodeDataUrl = await generateUpiQrDataUrl(upiUri);

  return {
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    upiId,
    displayName: upiDisplayName,
    payableAmountPaise: payablePaise,
    upiUri,
    qrCodeDataUrl,
  };
};

export const cancelInvoice = async (id, cancellationReason = "") => {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw ApiError.notFound("Invoice not found");
  }

  if (invoice.status === "cancelled") {
    throw ApiError.badRequest("Invoice is already cancelled");
  }

  invoice.status = "cancelled";
  invoice.cancellationReason = cancellationReason || "";
  await invoice.save();

  return invoice;
};
