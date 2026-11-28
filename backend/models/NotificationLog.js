import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
  {
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    recipientName: {
      type: String,
      trim: true,
      default: "",
    },
    notificationType: {
      type: String,
      enum: [
        "booking_confirmation",
        "equipment_issued",
        "invoice_generated",
        "payment_receipt",
        "upcoming_return_reminder",
        "overdue_rental_reminder",
        "rental_completed",
      ],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed", "skipped"],
      default: "sent",
      index: true,
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ["Booking", "Invoice", "Payment"],
        required: true,
        index: true,
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
      },
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    errorDetails: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationLogSchema.index({ createdAt: -1 });
notificationLogSchema.index({ notificationType: 1, status: 1 });
notificationLogSchema.index({ "relatedEntity.entityType": 1, "relatedEntity.entityId": 1 });

const NotificationLog = mongoose.model("NotificationLog", notificationLogSchema);

export default NotificationLog;
