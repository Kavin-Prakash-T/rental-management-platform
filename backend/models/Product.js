import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    issuedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    maintenanceQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    damagedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    hourlyRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    dailyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    condition: {
      type: String,
      enum: ["new", "good", "fair", "poor"],
      default: "good",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

productSchema.methods.recalculateAvailability = function () {
  const committed =
    (this.reservedQuantity || 0) +
    (this.issuedQuantity || 0) +
    (this.maintenanceQuantity || 0) +
    (this.damagedQuantity || 0);
  this.availableQuantity = Math.max(0, this.totalQuantity - committed);
  return this.availableQuantity;
};

const Product = mongoose.model("Product", productSchema);

export default Product;
