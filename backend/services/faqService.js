import Faq from "../models/Faq.js";
import ApiError from "../utils/ApiError.js";

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const createFaq = async (faqData) => {
  const cleanQuestion = faqData.question.trim();

  const existing = await Faq.findOne({
    question: new RegExp(`^${escapeRegex(cleanQuestion)}$`, "i"),
  });

  if (existing) {
    throw ApiError.conflict("An FAQ with this question already exists");
  }

  const cleanKeywords = Array.isArray(faqData.keywords)
    ? faqData.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)
    : [];

  const faq = await Faq.create({
    question: cleanQuestion,
    answer: faqData.answer.trim(),
    category: faqData.category?.trim() || "General",
    keywords: cleanKeywords,
    displayOrder: faqData.displayOrder !== undefined ? faqData.displayOrder : 0,
    isActive: faqData.isActive !== undefined ? faqData.isActive : true,
  });

  return faq;
};

export const getFaqs = async (filters = {}, isAdmin = false) => {
  const {
    category,
    search,
    isActive,
    page = 1,
    limit = 10,
    sortBy = "displayOrder",
    sortOrder = "asc",
  } = filters;

  const query = {};

  if (!isAdmin) {
    query.isActive = true;
  } else if (isActive !== undefined && isActive !== "all") {
    query.isActive = Boolean(isActive);
  }

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

  const sort = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;
  if (sortBy !== "createdAt") {
    sort.createdAt = -1;
  }

  const skip = (page - 1) * limit;

  const [faqs, total] = await Promise.all([
    Faq.find(query).sort(sort).skip(skip).limit(limit),
    Faq.countDocuments(query),
  ]);

  return {
    faqs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getFaqById = async (id, isAdmin = false) => {
  const faq = await Faq.findById(id);

  if (!faq) {
    throw ApiError.notFound("FAQ not found");
  }

  if (!isAdmin && !faq.isActive) {
    throw ApiError.notFound("FAQ not found");
  }

  return faq;
};

export const updateFaq = async (id, updateData) => {
  const faq = await Faq.findById(id);

  if (!faq) {
    throw ApiError.notFound("FAQ not found");
  }

  if (updateData.question) {
    const cleanQuestion = updateData.question.trim();
    const existing = await Faq.findOne({
      _id: { $ne: faq._id },
      question: new RegExp(`^${escapeRegex(cleanQuestion)}$`, "i"),
    });

    if (existing) {
      throw ApiError.conflict("An FAQ with this question already exists");
    }

    faq.question = cleanQuestion;
  }

  if (updateData.answer !== undefined) {
    faq.answer = updateData.answer.trim();
  }

  if (updateData.category !== undefined) {
    faq.category = updateData.category.trim();
  }

  if (updateData.keywords !== undefined) {
    faq.keywords = Array.isArray(updateData.keywords)
      ? updateData.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [];
  }

  if (updateData.displayOrder !== undefined) {
    faq.displayOrder = updateData.displayOrder;
  }

  if (updateData.isActive !== undefined) {
    faq.isActive = updateData.isActive;
  }

  await faq.save();

  return faq;
};

export const deactivateFaq = async (id) => {
  const faq = await Faq.findById(id);

  if (!faq) {
    throw ApiError.notFound("FAQ not found");
  }

  faq.isActive = false;
  await faq.save();

  return faq;
};

export const getActiveFaqsForKnowledgeBase = async (category = null) => {
  const query = { isActive: true };
  if (category) {
    query.category = new RegExp(`^${escapeRegex(category.trim())}$`, "i");
  }

  return await Faq.find(query)
    .sort({ displayOrder: 1, createdAt: 1 })
    .select("question answer category keywords");
};

export const searchKnowledgeBase = async (userQuery, limit = 5) => {
  if (!userQuery || !userQuery.trim()) {
    return await getActiveFaqsForKnowledgeBase();
  }

  const terms = userQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const queryConditions = [];
  for (const term of terms) {
    const escaped = escapeRegex(term);
    const regex = new RegExp(escaped, "i");
    queryConditions.push({ question: regex });
    queryConditions.push({ answer: regex });
    queryConditions.push({ keywords: regex });
  }

  const query = {
    isActive: true,
    ...(queryConditions.length > 0 ? { $or: queryConditions } : {}),
  };

  return await Faq.find(query)
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(limit)
    .select("question answer category keywords");
};
