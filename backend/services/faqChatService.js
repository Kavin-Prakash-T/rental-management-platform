import Faq from "../models/Faq.js";
import Product from "../models/Product.js";
import Settings from "../models/Settings.js";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be",
  "been", "being", "in", "on", "at", "to", "for", "with", "about", "against",
  "between", "into", "through", "during", "before", "after", "above", "below",
  "from", "up", "down", "of", "off", "over", "under", "again", "further",
  "then", "once", "here", "there", "when", "where", "why", "how", "all",
  "any", "both", "each", "few", "more", "most", "other", "some", "such",
  "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
  "can", "will", "just", "should", "now", "i", "you", "we", "they", "it",
  "do", "does", "did", "have", "has", "had", "what", "which", "who", "whom",
  "this", "that", "these", "those", "am", "please", "rent", "rental"
]);

const tokenize = (text = "") => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
};

const normalize = (text = "") => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
};

export const findDirectFaqMatch = async (userMessage = "") => {
  const normUser = normalize(userMessage);
  const userTokens = new Set(tokenize(userMessage));

  if (normUser.length === 0) return null;

  const faqs = await Faq.find({ isActive: true }).lean();
  if (!faqs || faqs.length === 0) return null;

  for (const faq of faqs) {
    const normFaq = normalize(faq.question);
    if (normUser === normFaq) {
      return faq;
    }
  }

  for (const faq of faqs) {
    const normFaq = normalize(faq.question);
    if (normUser.length >= 10 && normFaq.length >= 10) {
      if (normUser.includes(normFaq) || normFaq.includes(normUser)) {
        return faq;
      }
    }
  }

  let bestFaq = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const faqTokens = new Set([
      ...tokenize(faq.question),
      ...(faq.keywords || []).map((k) => k.toLowerCase().trim()),
    ]);

    if (faqTokens.size === 0) continue;

    let overlap = 0;
    for (const token of userTokens) {
      if (faqTokens.has(token)) {
        overlap++;
      }
    }

    const diceScore = (2 * overlap) / (userTokens.size + faqTokens.size);
    const userCoverage = userTokens.size > 0 ? overlap / userTokens.size : 0;

    if (overlap >= 2 && (diceScore >= 0.65 || userCoverage >= 0.75)) {
      if (diceScore > bestScore) {
        bestScore = diceScore;
        bestFaq = faq;
      }
    }
  }

  return bestFaq;
};

export const getRelevantContext = async (userMessage = "") => {
  const settingsDoc = await Settings.getSettings();
  const business = settingsDoc.toPublicJSON();

  const userTokens = tokenize(userMessage);
  const tokenSet = new Set(userTokens);

  const activeFaqs = await Faq.find({ isActive: true }).lean();
  const scoredFaqs = activeFaqs
    .map((faq) => {
      const faqTokens = new Set([
        ...tokenize(faq.question),
        ...(faq.keywords || []).map((k) => k.toLowerCase().trim()),
      ]);
      let score = 0;
      for (const token of tokenSet) {
        if (faqTokens.has(token)) score++;
      }
      return { faq, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.faq);

  let relevantProducts = [];
  if (userTokens.length > 0) {
    const regexConditions = userTokens.map((token) => ({
      $or: [
        { name: { $regex: token, $options: "i" } },
        { description: { $regex: token, $options: "i" } },
        { sku: { $regex: token, $options: "i" } },
      ],
    }));

    relevantProducts = await Product.find({
      isActive: true,
      $or: regexConditions,
    })
      .select("name sku category dailyRate hourlyRate description")
      .populate("category", "name")
      .limit(3)
      .lean();
  }

  return {
    business,
    faqs: scoredFaqs,
    products: relevantProducts,
  };
};
