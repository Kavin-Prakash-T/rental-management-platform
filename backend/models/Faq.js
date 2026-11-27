import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 5,
      maxlength: 300,
      index: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: "General",
      index: true,
    },
    keywords: {
      type: [String],
      default: [],
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

faqSchema.index({ isActive: 1, displayOrder: 1 });
faqSchema.index({ category: 1, isActive: 1 });
faqSchema.index({ keywords: 1, isActive: 1 });
faqSchema.index({ createdAt: -1 });

const Faq = mongoose.model("Faq", faqSchema);

export default Faq;
