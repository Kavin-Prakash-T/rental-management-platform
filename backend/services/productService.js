import Product from "../models/Product.js";
import Category from "../models/Category.js";
import ApiError from "../utils/ApiError.js";

export const generateSKU = async (name, categoryName = "EQ") => {
  const catPart = (categoryName || "EQ").replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "EQ";
  const namePart = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "PRD";

  let sku = "";
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    sku = `${catPart}-${namePart}-${randomDigits}`;
    exists = await Product.findOne({ sku });
    attempts++;
  }

  return sku;
};

export const createProduct = async (productData) => {
  const categoryDoc = await Category.findById(productData.category);

  if (!categoryDoc) {
    throw ApiError.badRequest("Selected category does not exist");
  }

  if (!categoryDoc.isActive) {
    throw ApiError.badRequest("Selected category is inactive and cannot be assigned to equipment");
  }

  let finalSku = productData.sku ? productData.sku.toUpperCase().trim() : "";

  if (finalSku) {
    const existingSku = await Product.findOne({ sku: finalSku });
    if (existingSku) {
      throw ApiError.conflict(`Product SKU '${finalSku}' already exists`);
    }
  } else {
    finalSku = await generateSKU(productData.name, categoryDoc.name);
  }

  const totalQuantity = productData.totalQuantity ?? 0;

  const product = await Product.create({
    name: productData.name.trim(),
    sku: finalSku,
    category: productData.category,
    description: productData.description ? productData.description.trim() : "",
    totalQuantity,
    availableQuantity: totalQuantity,
    reservedQuantity: 0,
    issuedQuantity: 0,
    maintenanceQuantity: 0,
    damagedQuantity: 0,
    hourlyRate: productData.hourlyRate ?? 0,
    dailyRate: productData.dailyRate,
    purchasePrice: productData.purchasePrice ?? 0,
    condition: productData.condition || "good",
    isActive: typeof productData.isActive === "boolean" ? productData.isActive : true,
  });

  return product.populate("category", "name slug");
};

export const getProducts = async ({
  search,
  category,
  condition,
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
      { sku: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (category) {
    query.category = category;
  }

  if (condition) {
    query.condition = condition;
  }

  if (typeof isActive === "boolean") {
    query.isActive = isActive;
  }

  const allowedSortFields = [
    "name",
    "sku",
    "totalQuantity",
    "availableQuantity",
    "dailyRate",
    "createdAt",
    "updatedAt",
  ];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug")
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  return {
    products,
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

export const getProductById = async (id) => {
  const product = await Product.findById(id).populate("category", "name slug");

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  return product;
};

export const updateProduct = async (id, updateData) => {
  const product = await Product.findById(id);

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  if (updateData.category && String(updateData.category) !== String(product.category)) {
    const categoryDoc = await Category.findById(updateData.category);
    if (!categoryDoc) {
      throw ApiError.badRequest("Selected category does not exist");
    }
    if (!categoryDoc.isActive) {
      throw ApiError.badRequest("Selected category is inactive and cannot be assigned to equipment");
    }
    product.category = updateData.category;
  }

  if (updateData.sku && updateData.sku.toUpperCase().trim() !== product.sku) {
    const newSku = updateData.sku.toUpperCase().trim();
    const existingSku = await Product.findOne({ _id: { $ne: id }, sku: newSku });
    if (existingSku) {
      throw ApiError.conflict(`Product SKU '${newSku}' already exists`);
    }
    product.sku = newSku;
  }

  if (typeof updateData.totalQuantity === "number") {
    const committed =
      (product.reservedQuantity || 0) +
      (product.issuedQuantity || 0) +
      (product.maintenanceQuantity || 0) +
      (product.damagedQuantity || 0);

    if (updateData.totalQuantity < committed) {
      throw ApiError.badRequest(
        `Total quantity cannot be reduced below ${committed} (currently committed/booked/damaged stock)`
      );
    }

    product.totalQuantity = updateData.totalQuantity;
    product.availableQuantity = updateData.totalQuantity - committed;
  }

  if (typeof updateData.name === "string") {
    product.name = updateData.name.trim();
  }

  if (typeof updateData.description === "string") {
    product.description = updateData.description.trim();
  }

  if (typeof updateData.hourlyRate === "number") {
    product.hourlyRate = updateData.hourlyRate;
  }

  if (typeof updateData.dailyRate === "number") {
    product.dailyRate = updateData.dailyRate;
  }

  if (typeof updateData.purchasePrice === "number") {
    product.purchasePrice = updateData.purchasePrice;
  }

  if (updateData.condition) {
    product.condition = updateData.condition;
  }

  if (typeof updateData.isActive === "boolean") {
    product.isActive = updateData.isActive;
  }

  await product.save();
  return product.populate("category", "name slug");
};

export const deleteProduct = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  product.isActive = false;
  await product.save();

  return {
    product,
    deactivated: true,
    message: "Product safely deactivated.",
  };
};
