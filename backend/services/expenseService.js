import Expense from "../models/Expense.js";
import Maintenance from "../models/Maintenance.js";
import Transport from "../models/Transport.js";
import ApiError from "../utils/ApiError.js";

export const generateExpenseNumber = async (prefix = "EXP") => {
  const cleanPrefix = (prefix || "EXP").trim().toUpperCase();
  const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
  let expenseNumber = "";
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    expenseNumber = `${cleanPrefix}-${yearMonth}-${randomPart}`;
    exists = await Expense.findOne({ expenseNumber });
    attempts++;
  }

  return expenseNumber;
};

export const createExpense = async (expenseData, adminId) => {
  const expenseDate = expenseData.date ? new Date(expenseData.date) : new Date();

  if (isNaN(expenseDate.getTime())) {
    throw ApiError.badRequest("Invalid expense date format");
  }

  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  if (expenseDate > oneYearFromNow) {
    throw ApiError.badRequest("Expense date cannot be in the distant future");
  }

  let maintenanceId = expenseData.relatedMaintenance || null;
  if (!maintenanceId && expenseData.relatedEntity?.entityType === "Maintenance" && expenseData.relatedEntity?.entityId) {
    maintenanceId = expenseData.relatedEntity.entityId;
  }

  if (maintenanceId) {
    const maintenance = await Maintenance.findById(maintenanceId);
    if (!maintenance) {
      throw ApiError.notFound("Referenced maintenance record was not found");
    }

    const existingActiveExpense = await Expense.findOne({
      relatedMaintenance: maintenanceId,
      status: "active",
    });

    if (existingActiveExpense) {
      throw ApiError.conflict(
        `An active expense record (${existingActiveExpense.expenseNumber}) is already linked to this maintenance task`
      );
    }
  }

  let transportId = null;
  if (expenseData.relatedEntity?.entityType === "Transport" && expenseData.relatedEntity?.entityId) {
    transportId = expenseData.relatedEntity.entityId;
  }

  if (transportId) {
    const transport = await Transport.findById(transportId);
    if (!transport) {
      throw ApiError.notFound("Referenced transport record was not found");
    }

    if (transport.paymentResponsibility === "customer_direct") {
      throw ApiError.badRequest(
        "Cannot record a business expense for customer-direct transport settlements"
      );
    }
  }

  const expenseNumber = await generateExpenseNumber("EXP");

  const expense = await Expense.create({
    expenseNumber,
    category: expenseData.category,
    amount: expenseData.amount,
    description: expenseData.description.trim(),
    date: expenseDate,
    paymentMethod: expenseData.paymentMethod,
    relatedEntity: expenseData.relatedEntity || {
      entityType: maintenanceId ? "Maintenance" : "none",
      entityId: maintenanceId || null,
    },
    relatedMaintenance: maintenanceId,
    status: "active",
    isVoided: false,
    createdBy: adminId || null,
    notes: expenseData.notes?.trim() || "",
  });

  return await Expense.findById(expense._id)
    .populate("relatedMaintenance")
    .populate("createdBy", "name email");
};

export const getExpenses = async (filters = {}) => {
  const {
    category,
    paymentMethod,
    status = "active",
    startDate,
    endDate,
    search,
    page = 1,
    limit = 10,
    sortBy = "date",
    sortOrder = "desc",
  } = filters;

  const query = {};

  if (category) {
    query.category = category;
  }

  if (paymentMethod) {
    query.paymentMethod = paymentMethod;
  }

  if (status && status !== "all") {
    query.status = status;
    query.isVoided = status === "voided";
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        query.date.$gte = s;
      }
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) {
        query.date.$lte = e;
      }
    }
    if (Object.keys(query.date).length === 0) {
      delete query.date;
    }
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { expenseNumber: regex },
      { description: regex },
      { notes: regex },
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  const [expenses, total] = await Promise.all([
    Expense.find(query)
      .populate("relatedMaintenance", "maintenanceType cost status")
      .populate("createdBy", "name email")
      .populate("voidedBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Expense.countDocuments(query),
  ]);

  return {
    expenses,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getExpenseById = async (id) => {
  const expense = await Expense.findById(id)
    .populate("relatedMaintenance")
    .populate("createdBy", "name email")
    .populate("voidedBy", "name email");

  if (!expense) {
    throw ApiError.notFound("Expense record not found");
  }

  return expense;
};

export const updateExpense = async (id, updateData) => {
  const expense = await Expense.findById(id);
  if (!expense) {
    throw ApiError.notFound("Expense record not found");
  }

  if (expense.isVoided || expense.status === "voided") {
    throw ApiError.badRequest("Cannot modify a voided expense record");
  }

  if (updateData.date) {
    const d = new Date(updateData.date);
    if (isNaN(d.getTime())) {
      throw ApiError.badRequest("Invalid expense date format");
    }
    updateData.date = d;
  }

  let maintenanceId = updateData.relatedMaintenance !== undefined
    ? updateData.relatedMaintenance
    : expense.relatedMaintenance;

  if (updateData.relatedEntity?.entityType === "Maintenance" && updateData.relatedEntity?.entityId) {
    maintenanceId = updateData.relatedEntity.entityId;
  }

  if (maintenanceId && maintenanceId.toString() !== expense.relatedMaintenance?.toString()) {
    const maintenance = await Maintenance.findById(maintenanceId);
    if (!maintenance) {
      throw ApiError.notFound("Referenced maintenance record was not found");
    }

    const existingActiveExpense = await Expense.findOne({
      _id: { $ne: expense._id },
      relatedMaintenance: maintenanceId,
      status: "active",
    });

    if (existingActiveExpense) {
      throw ApiError.conflict(
        `An active expense record (${existingActiveExpense.expenseNumber}) is already linked to this maintenance task`
      );
    }
  }

  if (updateData.category !== undefined) expense.category = updateData.category;
  if (updateData.amount !== undefined) expense.amount = updateData.amount;
  if (updateData.description !== undefined) expense.description = updateData.description.trim();
  if (updateData.date !== undefined) expense.date = updateData.date;
  if (updateData.paymentMethod !== undefined) expense.paymentMethod = updateData.paymentMethod;
  if (updateData.notes !== undefined) expense.notes = updateData.notes.trim();

  if (updateData.relatedEntity !== undefined) {
    expense.relatedEntity = updateData.relatedEntity;
  }
  if (updateData.relatedMaintenance !== undefined) {
    expense.relatedMaintenance = updateData.relatedMaintenance;
  }

  await expense.save();

  return await Expense.findById(expense._id)
    .populate("relatedMaintenance")
    .populate("createdBy", "name email");
};

export const voidExpense = async (id, voidReason, adminId) => {
  const expense = await Expense.findById(id);
  if (!expense) {
    throw ApiError.notFound("Expense record not found");
  }

  if (expense.isVoided || expense.status === "voided") {
    throw ApiError.badRequest("Expense is already voided");
  }

  expense.status = "voided";
  expense.isVoided = true;
  expense.voidReason = voidReason.trim();
  expense.voidedAt = new Date();
  expense.voidedBy = adminId || null;

  await expense.save();

  return await Expense.findById(expense._id)
    .populate("relatedMaintenance")
    .populate("createdBy", "name email")
    .populate("voidedBy", "name email");
};

export const getExpenseSummary = async (filters = {}) => {
  const { startDate, endDate, category } = filters;

  const matchQuery = {
    status: "active",
    isVoided: { $ne: true },
  };

  if (category) {
    matchQuery.category = category;
  }

  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) matchQuery.date.$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) matchQuery.date.$lte = e;
    }
    if (Object.keys(matchQuery.date).length === 0) {
      delete matchQuery.date;
    }
  }

  const [categoryAggregation, overallAggregation] = await Promise.all([
    Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]),
    Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const totalAmount = overallAggregation[0]?.totalAmount || 0;
  const totalCount = overallAggregation[0]?.count || 0;

  const byCategory = categoryAggregation.map((item) => ({
    category: item._id,
    totalAmount: item.totalAmount,
    count: item.count,
    percentageOfTotal: totalAmount > 0 ? Math.round((item.totalAmount / totalAmount) * 10000) / 100 : 0,
  }));

  return {
    totalAmount,
    totalCount,
    byCategory,
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      category: category || null,
    },
  };
};
