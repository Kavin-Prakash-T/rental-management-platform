import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "equipment_purchase",
        "maintenance",
        "salaries",
        "electricity",
        "shop_rent",
        "fuel",
        "miscellaneous",
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank_transfer"],
      required: true,
      index: true,
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ["Maintenance", "Product", "Transport", "none"],
        default: "none",
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "relatedEntity.entityType",
        default: null,
      },
    },
    relatedMaintenance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Maintenance",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "voided"],
      default: "active",
      index: true,
    },
    isVoided: {
      type: Boolean,
      default: false,
      index: true,
    },
    voidReason: {
      type: String,
      trim: true,
      default: "",
    },
    voidedAt: {
      type: Date,
      default: null,
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
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

expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ date: -1, status: 1 });
expenseSchema.index({ relatedMaintenance: 1, status: 1 });
expenseSchema.index({ createdAt: -1 });

const Expense = mongoose.model("Expense", expenseSchema);

export default Expense;
