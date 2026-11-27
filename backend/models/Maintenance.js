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
    maintenanceType: {
      type: String,
      enum: ["scheduled", "corrective"],
      default: "scheduled",
      index: true,
    },
    issueDescription: {
      type: String,
      trim: true,
      default: "",
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
    scheduledStartDate: {
      type: Date,
    },
    scheduledEndDate: {
      type: Date,
    },
    actualCompletionDate: {
      type: Date,
      default: null,
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

maintenanceSchema.pre("save", function () {
  if (this.startDate && !this.scheduledStartDate) {
    this.scheduledStartDate = this.startDate;
  }
  if (this.endDate && !this.scheduledEndDate) {
    this.scheduledEndDate = this.endDate;
  }
  if (this.actualCompletionDate && !this.actualReturnDate) {
    this.actualReturnDate = this.actualCompletionDate;
  }
  if (this.actualReturnDate && !this.actualCompletionDate) {
    this.actualCompletionDate = this.actualReturnDate;
  }
  if (!this.issueDescription && this.reason) {
    this.issueDescription = this.reason;
  }
  if (!this.reason && this.issueDescription) {
    this.reason = this.issueDescription;
  }
});

maintenanceSchema.index({ product: 1, status: 1, startDate: 1, endDate: 1 });
maintenanceSchema.index({ status: 1, startDate: 1, endDate: 1 });
maintenanceSchema.index({ createdAt: -1 });

const Maintenance = mongoose.model("Maintenance", maintenanceSchema);

export default Maintenance;
