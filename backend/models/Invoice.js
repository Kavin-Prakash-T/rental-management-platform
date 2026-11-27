import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    dailyRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    hourlyRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    appliedRate: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    customer: {
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
      },
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, default: "" },
      address: {
        street: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        pincode: { type: String, default: "" },
      },
    },
    businessDetails: {
      name: { type: String, default: "" },
      address: {
        street: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        pincode: { type: String, default: "" },
        country: { type: String, default: "India" },
      },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      gstin: { type: String, default: "" },
      upiId: { type: String, default: "" },
      upiDisplayName: { type: String, default: "" },
    },
    rentalPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      duration: { type: Number, required: true, min: 1 },
      rentalType: {
        type: String,
        enum: ["daily", "hourly"],
        default: "daily",
      },
    },
    items: [invoiceItemSchema],
    pricing: {
      equipmentSubtotal: { type: Number, required: true, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      taxableAmount: { type: Number, required: true, min: 0 },
      tax: {
        rate: { type: Number, default: 18, min: 0 },
        cgst: { type: Number, default: 0, min: 0 },
        sgst: { type: Number, default: 0, min: 0 },
        igst: { type: Number, default: 0, min: 0 },
        totalTax: { type: Number, default: 0, min: 0 },
      },
      rentalRevenue: { type: Number, required: true, min: 0 },
      transportation: {
        required: { type: Boolean, default: false },
        serviceType: { type: String, default: "none" },
        passThroughCost: { type: Number, default: 0, min: 0 },
        arrangementFee: { type: Number, default: 0, min: 0 },
        paymentResponsibility: { type: String, default: "none" },
        totalCharged: { type: Number, default: 0, min: 0 },
      },
      refundableDeposit: { type: Number, default: 0, min: 0 },
      totalInvoiceAmount: { type: Number, required: true, min: 0 },
      totalPaid: { type: Number, default: 0, min: 0 },
      outstandingBalance: { type: Number, required: true, min: 0 },
    },
    status: {
      type: String,
      enum: ["issued", "paid", "partially_paid", "cancelled"],
      default: "issued",
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

invoiceSchema.index({ booking: 1, status: 1 });
invoiceSchema.index({ createdAt: -1 });

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
