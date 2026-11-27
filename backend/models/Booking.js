import mongoose from "mongoose";

const bookingItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    sku: {
      type: String,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    issuedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    returnedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    damagedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    rateSnapshot: {
      dailyRate: { type: Number, min: 0, default: 0 },
      hourlyRate: { type: Number, min: 0, default: 0 },
      appliedRate: { type: Number, min: 0, default: 0 },
      rentalType: {
        type: String,
        enum: ["daily", "hourly"],
        default: "daily",
      },
    },
    subtotal: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: true }
);

const returnLogItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    condition: {
      type: String,
      enum: ["good", "fair", "damaged", "poor"],
      default: "good",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const returnLogSchema = new mongoose.Schema(
  {
    returnDate: {
      type: Date,
      default: Date.now,
    },
    items: [returnLogItemSchema],
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true, timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: {
      type: [bookingItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Booking must contain at least one equipment item",
      },
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    rentalType: {
      type: String,
      enum: ["daily", "hourly"],
      default: "daily",
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    tax: {
      rate: { type: Number, default: 18, min: 0 },
      cgst: { type: Number, default: 0, min: 0 },
      sgst: { type: Number, default: 0, min: 0 },
      igst: { type: Number, default: 0, min: 0 },
      totalTax: { type: Number, default: 0, min: 0 },
    },
    refundableDeposit: {
      type: Number,
      min: 0,
      default: 0,
    },
    transportation: {
      required: { type: Boolean, default: false },
      type: {
        type: String,
        enum: ["pickup", "delivery", "both", "none"],
        default: "none",
      },
      fee: { type: Number, default: 0, min: 0 },
      deliveryAddress: {
        street: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        pincode: { type: String, trim: true, default: "" },
      },
    },
    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "confirmed", "issued", "completed", "cancelled"],
      default: "draft",
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },
    actualStartDate: {
      type: Date,
      default: null,
    },
    actualReturnDate: {
      type: Date,
      default: null,
    },
    returnLogs: [returnLogSchema],
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    idempotencyKey: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookingSchema.index({ status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ "items.product": 1, status: 1 });
bookingSchema.index({ "items.product": 1, status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
