import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
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
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank_transfer"],
      required: true,
      index: true,
    },
    transactionReference: {
      type: String,
      trim: true,
      default: "",
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["advance", "rental", "deposit", "refund", "reversal"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["verified", "reversed", "refunded"],
      default: "verified",
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    originalPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
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

paymentSchema.index({ booking: 1, status: 1 });
paymentSchema.index({ invoice: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
