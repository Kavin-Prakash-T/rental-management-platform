import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Settings from "../models/Settings.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Faq from "../models/Faq.js";

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const getPublicBusiness = asyncHandler(async (_req, res) => {
  const settings = await Settings.getSettings();
  const publicData = settings.toPublicJSON();
  return ApiResponse.success(res, publicData, "Public business details retrieved successfully");
});

export const getPublicProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    condition,
    page = 1,
    limit = 12,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const query = { isActive: true };

  if (category) {
    if (/^[0-9a-fA-F]{24}$/.test(category)) {
      query.category = category;
    } else {
      const cat = await Category.findOne({
        slug: category.toLowerCase().trim(),
        isActive: true,
      });
      if (cat) {
        query.category = cat._id;
      } else {
        query.category = null;
      }
    }
  }

  if (condition) {
    query.condition = condition;
  }

  if (search) {
    const escaped = escapeRegex(search.trim());
    const regex = new RegExp(escaped, "i");
    query.$or = [{ name: regex }, { description: regex }];
  }

  const sort = {};
  sort[sortBy] = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .select("_id name sku category description dailyRate hourlyRate condition createdAt")
      .populate("category", "name slug description")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  return ApiResponse.success(
    res,
    {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
    "Public equipment catalog retrieved successfully"
  );
});

export const getPublicProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isActive: true,
  })
    .select("_id name sku category description dailyRate hourlyRate condition createdAt")
    .populate("category", "name slug description");

  if (!product) {
    throw ApiError.notFound("Equipment not found or is currently unavailable");
  }

  return ApiResponse.success(res, product, "Equipment details retrieved successfully");
});

export const getPublicCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ isActive: true })
    .select("_id name slug description")
    .sort({ name: 1 });

  return ApiResponse.success(res, categories, "Active categories retrieved successfully");
});

export const getPublicFaqs = asyncHandler(async (req, res) => {
  const { category, search } = req.query;

  const query = { isActive: true };

  if (category) {
    query.category = new RegExp(`^${escapeRegex(category.trim())}$`, "i");
  }

  if (search) {
    const escaped = escapeRegex(search.trim());
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { question: regex },
      { answer: regex },
      { category: regex },
      { keywords: regex },
    ];
  }

  const faqs = await Faq.find(query)
    .select("_id question answer category keywords displayOrder")
    .sort({ displayOrder: 1, createdAt: 1 });

  return ApiResponse.success(res, faqs, "Public FAQs retrieved successfully");
});
