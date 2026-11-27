import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const transportSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      enum: ["delivery", "pickup", "both"],
      default: "delivery",
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    pickupAddress: {
      type: addressSchema,
      default: () => ({}),
    },
    deliveryAddress: {
      type: addressSchema,
      default: () => ({}),
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },
    transportationCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    arrangementFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentResponsibility: {
      type: String,
      enum: ["customer_direct", "shop_collected"],
      required: true,
      default: "shop_collected",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "collected", "paid_to_provider", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "in_transit", "completed", "cancelled"],
      default: "scheduled",
      index: true,
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

transportSchema.virtual("totalTransportationAmount").get(function () {
  return (this.transportationCost || 0) + (this.arrangementFee || 0);
});

transportSchema.virtual("isPassThrough").get(function () {
  return this.paymentResponsibility === "shop_collected";
});

transportSchema.index({ booking: 1, serviceType: 1, status: 1 });
transportSchema.index({ status: 1, scheduledDate: 1 });
transportSchema.index({ createdAt: -1 });

const Transport = mongoose.model("Transport", transportSchema);

export default Transport;
