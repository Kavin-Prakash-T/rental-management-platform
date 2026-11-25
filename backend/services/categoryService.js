import mongoose from "mongoose";
import Category from "../models/Category.js";
import ApiError from "../utils/ApiError.js";

export const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getUniqueSlug = async (name, currentId = null) => {
  const baseSlug = generateSlug(name) || "category";
  let slug = baseSlug;
  let count = 1;

  while (true) {
    const existing = await Category.findOne({
      slug,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${count}`;
    count++;
  }
};

export const createCategory = async ({ name, description = "", isActive = true }) => {
  const trimmedName = name.trim();

  const existingByName = await Category.findOne({
    name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
  });

  if (existingByName) {
    throw ApiError.conflict(`Category with name '${trimmedName}' already exists`);
  }

  const slug = await getUniqueSlug(trimmedName);

  const category = await Category.create({
    name: trimmedName,
    slug,
    description: description.trim(),
    isActive,
  });

  return category;
};

export const getCategories = async ({
  search,
  isActive,
  page = 1,
  limit = 10,
  sortBy = "createdAt",
  sortOrder = "desc",
}) => {
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (typeof isActive === "boolean") {
    query.isActive = isActive;
  }

  const allowedSortFields = ["name", "createdAt", "updatedAt", "isActive"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  const [categories, total] = await Promise.all([
    Category.find(query)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit),
    Category.countDocuments(query),
  ]);

  return {
    categories,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

export const getCategoryById = async (id) => {
  const category = await Category.findById(id);

  if (!category) {
    throw ApiError.notFound("Category not found");
  }

  return category;
};

export const updateCategory = async (id, updateData) => {
  const category = await Category.findById(id);

  if (!category) {
    throw ApiError.notFound("Category not found");
  }

  if (updateData.name && updateData.name.trim() !== category.name) {
    const trimmedName = updateData.name.trim();

    const duplicate = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (duplicate) {
      throw ApiError.conflict(`Category with name '${trimmedName}' already exists`);
    }

    category.name = trimmedName;
    category.slug = await getUniqueSlug(trimmedName, id);
  }

  if (typeof updateData.description === "string") {
    category.description = updateData.description.trim();
  }

  if (typeof updateData.isActive === "boolean") {
    category.isActive = updateData.isActive;
  }

  await category.save();
  return category;
};

export const deleteCategory = async (id) => {
  const category = await Category.findById(id);

  if (!category) {
    throw ApiError.notFound("Category not found");
  }

  const ProductModel = mongoose.models.Product;
  const isReferenced = ProductModel ? await ProductModel.exists({ category: id }) : false;

  if (isReferenced) {
    category.isActive = false;
    await category.save();
    return {
      category,
      deactivated: true,
      message: "Category is referenced by existing equipment and has been safely deactivated instead of deleted.",
    };
  }

  category.isActive = false;
  await category.save();

  return {
    category,
    deactivated: true,
    message: "Category safely deactivated.",
  };
};
