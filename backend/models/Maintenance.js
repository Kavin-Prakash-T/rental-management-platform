import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
      index: true,
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
    actualReturnDate: {
      type: Date,
      default: null,
    },
    cost: {
      type: Number,
      min: 0,
      default: 0,
    },
    performedBy: {
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

maintenanceSchema.index({ product: 1, status: 1, startDate: 1, endDate: 1 });
maintenanceSchema.index({ status: 1, startDate: 1, endDate: 1 });
maintenanceSchema.index({ createdAt: -1 });

const Maintenance = mongoose.model("Maintenance", maintenanceSchema);

export default Maintenance;
