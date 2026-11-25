import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
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

categorySchema.index({ name: 1 });
categorySchema.index({ createdAt: -1 });

categorySchema.statics.validateActiveCategory = async function (categoryId) {
  const category = await this.findById(categoryId);
  if (!category || !category.isActive) {
    return false;
  }
  return true;
};

const Category = mongoose.model("Category", categorySchema);

export default Category;
