import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import Expense from "../models/Expense.js";
import Booking from "../models/Booking.js";
import Product from "../models/Product.js";
import Maintenance from "../models/Maintenance.js";
import Transport from "../models/Transport.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const buildDateMatch = (startDate, endDate, field = "createdAt") => {
  const match = {};
  if (startDate || endDate) {
    match[field] = {};
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) match[field].$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) match[field].$lte = e;
    }
    if (Object.keys(match[field]).length === 0) {
      delete match[field];
    }
  }
  return match;
};

export const getRevenueAnalytics = async (filters = {}) => {
  const { startDate, endDate, groupBy = "month" } = filters;
  const invoiceDateMatch = buildDateMatch(startDate, endDate, "createdAt");
  const paymentDateMatch = buildDateMatch(startDate, endDate, "paymentDate");

  const [invoiceAggregation, paymentAggregation, monthlyInvoices, monthlyPayments] =
    await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            ...invoiceDateMatch,
          },
        },
        {
          $group: {
            _id: null,
            totalRentalRevenue: { $sum: "$pricing.rentalRevenue" },
            totalArrangementFees: {
              $sum: { $ifNull: ["$pricing.transportation.arrangementFee", 0] },
            },
            totalGrossInvoiced: { $sum: "$pricing.totalInvoiceAmount" },
            totalInvoicesCount: { $sum: 1 },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: {
            status: "verified",
            purpose: { $in: ["advance", "rental"] },
            ...paymentDateMatch,
          },
        },
        {
          $group: {
            _id: null,
            totalCashCollected: { $sum: "$amount" },
            totalCollectionsCount: { $sum: 1 },
          },
        },
      ]),

      Invoice.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            ...invoiceDateMatch,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            invoicedRentalRevenue: { $sum: "$pricing.rentalRevenue" },
            arrangementFees: {
              $sum: { $ifNull: ["$pricing.transportation.arrangementFee", 0] },
            },
            invoiceCount: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      Payment.aggregate([
        {
          $match: {
            status: "verified",
            purpose: { $in: ["advance", "rental"] },
            ...paymentDateMatch,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$paymentDate" },
              month: { $month: "$paymentDate" },
            },
            cashCollected: { $sum: "$amount" },
            paymentsCount: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

  const invTotals = invoiceAggregation[0] || {};
  const totalRentalRevenue = invTotals.totalRentalRevenue || 0;
  const totalArrangementFees = invTotals.totalArrangementFees || 0;
  const totalOperatingRevenue = totalRentalRevenue + totalArrangementFees;
  const totalGrossInvoiced = invTotals.totalGrossInvoiced || 0;
  const totalInvoicesCount = invTotals.totalInvoicesCount || 0;

  const payTotals = paymentAggregation[0] || {};
  const totalCashCollected = payTotals.totalCashCollected || 0;
  const totalCollectionsCount = payTotals.totalCollectionsCount || 0;

  const trendMap = new Map();

  for (const inv of monthlyInvoices) {
    const key = `${inv._id.year}-${String(inv._id.month).padStart(2, "0")}`;
    const opRev = (inv.invoicedRentalRevenue || 0) + (inv.arrangementFees || 0);
    trendMap.set(key, {
      year: inv._id.year,
      month: inv._id.month,
      period: key,
      monthName: MONTH_NAMES[inv._id.month - 1] || "",
      invoicedRentalRevenue: inv.invoicedRentalRevenue,
      arrangementFees: inv.arrangementFees,
      totalOperatingRevenue: opRev,
      invoiceCount: inv.invoiceCount,
      cashCollected: 0,
    });
  }

  for (const pay of monthlyPayments) {
    const key = `${pay._id.year}-${String(pay._id.month).padStart(2, "0")}`;
    const existing = trendMap.get(key) || {
      year: pay._id.year,
      month: pay._id.month,
      period: key,
      monthName: MONTH_NAMES[pay._id.month - 1] || "",
      invoicedRentalRevenue: 0,
      arrangementFees: 0,
      totalOperatingRevenue: 0,
      invoiceCount: 0,
      cashCollected: 0,
    };
    existing.cashCollected = pay.cashCollected;
    trendMap.set(key, existing);
  }

  const trends = Array.from(trendMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  return {
    totalOperatingRevenue,
    totalInvoicedRentalRevenue: totalRentalRevenue,
    totalArrangementFees,
    totalGrossInvoiced,
    totalCashCollected,
    totalInvoicesCount,
    totalCollectionsCount,
    trends,
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      groupBy,
    },
  };
};

export const getExpenseAnalytics = async (filters = {}) => {
  const { startDate, endDate, category, groupBy = "month" } = filters;
  const expenseDateMatch = buildDateMatch(startDate, endDate, "date");

  const matchQuery = {
    status: "active",
    isVoided: { $ne: true },
    ...expenseDateMatch,
  };

  if (category) {
    matchQuery.category = category;
  }

  const [categoryAggregation, overallAggregation, monthlyAggregation] =
    await Promise.all([
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
            totalExpenses: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      Expense.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
            },
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

  const totalExpenses = overallAggregation[0]?.totalExpenses || 0;
  const totalCount = overallAggregation[0]?.count || 0;

  const byCategory = categoryAggregation.map((c) => ({
    category: c._id,
    totalAmount: c.totalAmount,
    count: c.count,
    percentage:
      totalExpenses > 0
        ? Math.round((c.totalAmount / totalExpenses) * 10000) / 100
        : 0,
  }));

  const trends = monthlyAggregation.map((m) => {
    const key = `${m._id.year}-${String(m._id.month).padStart(2, "0")}`;
    return {
      year: m._id.year,
      month: m._id.month,
      period: key,
      monthName: MONTH_NAMES[m._id.month - 1] || "",
      amount: m.totalAmount,
      count: m.count,
    };
  });

  return {
    totalExpenses,
    totalCount,
    byCategory,
    trends,
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      category: category || null,
      groupBy,
    },
  };
};

export const getProfitAnalytics = async (filters = {}) => {
  const [revenueData, expenseData] = await Promise.all([
    getRevenueAnalytics(filters),
    getExpenseAnalytics(filters),
  ]);

  const totalInvoicedRevenue = revenueData.totalOperatingRevenue;
  const totalCashCollected = revenueData.totalCashCollected;
  const totalExpenses = expenseData.totalExpenses;

  const operatingProfitAccrual = totalInvoicedRevenue - totalExpenses;
  const operatingProfitCash = totalCashCollected - totalExpenses;

  const accrualMargin =
    totalInvoicedRevenue > 0
      ? Math.round((operatingProfitAccrual / totalInvoicedRevenue) * 10000) / 100
      : 0;

  const cashMargin =
    totalCashCollected > 0
      ? Math.round((operatingProfitCash / totalCashCollected) * 10000) / 100
      : 0;

  const trendMap = new Map();

  for (const r of revenueData.trends) {
    trendMap.set(r.period, {
      period: r.period,
      year: r.year,
      month: r.month,
      monthName: r.monthName,
      invoicedRevenue: r.totalOperatingRevenue,
      cashCollected: r.cashCollected,
      expenses: 0,
      accrualProfit: r.totalOperatingRevenue,
      cashProfit: r.cashCollected,
      marginPercentage: 100,
    });
  }

  for (const e of expenseData.trends) {
    const existing = trendMap.get(e.period) || {
      period: e.period,
      year: e.year,
      month: e.month,
      monthName: e.monthName,
      invoicedRevenue: 0,
      cashCollected: 0,
      expenses: 0,
      accrualProfit: 0,
      cashProfit: 0,
      marginPercentage: 0,
    };
    existing.expenses = e.amount;
    existing.accrualProfit = existing.invoicedRevenue - e.amount;
    existing.cashProfit = existing.cashCollected - e.amount;
    existing.marginPercentage =
      existing.invoicedRevenue > 0
        ? Math.round((existing.accrualProfit / existing.invoicedRevenue) * 10000) / 100
        : 0;
    trendMap.set(e.period, existing);
  }

  const trends = Array.from(trendMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  return {
    totalInvoicedRevenue,
    totalCashCollected,
    totalExpenses,
    operatingProfitAccrual,
    operatingProfitCash,
    accrualMarginPercentage: accrualMargin,
    cashMarginPercentage: cashMargin,
    accountingBasis: {
      accrual:
        "Billed equipment rental revenue plus transportation arrangement fees minus active operating expenses.",
      cash: "Verified advance and rental cash collections minus active operating expenses.",
      exclusions:
        "Refundable customer deposits and pass-through third-party transport costs are strictly excluded from revenue and profit.",
    },
    trends,
    filters: filters,
  };
};

export const getProductPerformanceAnalytics = async (filters = {}) => {
  const { startDate, endDate, limit = 10 } = filters;
  const bookingDateMatch = buildDateMatch(startDate, endDate, "createdAt");

  const [mostRented, categoryStats] = await Promise.all([
    Booking.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "issued", "completed"] },
          ...bookingDateMatch,
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          sku: { $first: "$items.sku" },
          totalQuantityRented: { $sum: "$items.quantity" },
          timesBooked: { $sum: 1 },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      {
        $unwind: {
          path: "$productDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "productDoc.category",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      {
        $unwind: {
          path: "$categoryDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          productId: "$_id",
          name: { $ifNull: ["$name", "$productDoc.name"] },
          sku: { $ifNull: ["$sku", "$productDoc.sku"] },
          categoryName: { $ifNull: ["$categoryDoc.name", "Uncategorized"] },
          totalQuantityRented: 1,
          timesBooked: 1,
          totalRevenue: 1,
          currentStock: "$productDoc.totalQuantity",
          availableStock: "$productDoc.availableQuantity",
        },
      },
      { $sort: { totalQuantityRented: -1, totalRevenue: -1 } },
      { $limit: limit },
    ]),

    Booking.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "issued", "completed"] },
          ...bookingDateMatch,
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "prod",
        },
      },
      { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "prod.category",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$prod.category",
          categoryName: { $first: "$cat.name" },
          totalRevenue: { $sum: "$items.subtotal" },
          totalQuantityRented: { $sum: "$items.quantity" },
          bookingCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]),
  ]);

  return {
    mostRentedEquipment: mostRented,
    categoryPerformance: categoryStats.map((c) => ({
      categoryId: c._id,
      categoryName: c.categoryName || "Uncategorized",
      totalRevenue: c.totalRevenue,
      totalQuantityRented: c.totalQuantityRented,
      bookingCount: c.bookingCount,
    })),
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      limit,
    },
  };
};

export const getEquipmentUtilizationAnalytics = async (filters = {}) => {
  const { startDate, endDate, productId } = filters;
  const now = new Date();

  const effectiveStart = startDate
    ? new Date(startDate)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const effectiveEnd = endDate ? new Date(endDate) : now;

  const periodDurationMs = Math.max(
    1000 * 60 * 60 * 24,
    effectiveEnd.getTime() - effectiveStart.getTime()
  );
  const periodDays = Math.max(1, Math.ceil(periodDurationMs / (1000 * 60 * 60 * 24)));

  const productQuery = { isActive: true };
  if (productId) {
    productQuery._id = productId;
  }

  const products = await Product.find(productQuery).populate("category", "name");

  const overlappingBookings = await Booking.find({
    status: { $in: ["confirmed", "issued", "completed"] },
    startDate: { $lt: effectiveEnd },
    endDate: { $gt: effectiveStart },
  });

  let fleetCapacityUnitDays = 0;
  let fleetRentedUnitDays = 0;

  const productUtilization = products.map((prod) => {
    const prodIdStr = prod._id.toString();
    const capacityUnitDays = prod.totalQuantity * periodDays;
    fleetCapacityUnitDays += capacityUnitDays;

    let rentedUnitDays = 0;

    for (const booking of overlappingBookings) {
      for (const item of booking.items) {
        if (item.product?.toString() === prodIdStr) {
          const itemStart = Math.max(
            effectiveStart.getTime(),
            new Date(booking.startDate).getTime()
          );
          const itemEnd = Math.min(
            effectiveEnd.getTime(),
            new Date(booking.endDate).getTime()
          );
          const overlapMs = Math.max(0, itemEnd - itemStart);
          const overlapDays = overlapMs / (1000 * 60 * 60 * 24);
          rentedUnitDays += item.quantity * overlapDays;
        }
      }
    }

    fleetRentedUnitDays += rentedUnitDays;

    const utilizationPercentage =
      capacityUnitDays > 0
        ? Math.min(100, Math.round((rentedUnitDays / capacityUnitDays) * 10000) / 100)
        : 0;

    return {
      productId: prod._id,
      name: prod.name,
      sku: prod.sku,
      categoryName: prod.category?.name || "Uncategorized",
      totalQuantity: prod.totalQuantity,
      availableQuantity: prod.availableQuantity,
      periodDays,
      capacityUnitDays,
      rentedUnitDays: Math.round(rentedUnitDays * 100) / 100,
      utilizationPercentage,
    };
  });

  const overallFleetUtilizationRate =
    fleetCapacityUnitDays > 0
      ? Math.min(
          100,
          Math.round((fleetRentedUnitDays / fleetCapacityUnitDays) * 10000) / 100
        )
      : 0;

  productUtilization.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

  return {
    overallFleetUtilizationRate,
    fleetCapacityUnitDays,
    fleetRentedUnitDays: Math.round(fleetRentedUnitDays * 100) / 100,
    periodDays,
    period: {
      startDate: effectiveStart.toISOString(),
      endDate: effectiveEnd.toISOString(),
    },
    definition:
      "Equipment utilization is defined as total rented unit-time divided by eligible capacity unit-time across the selected interval.",
    products: productUtilization,
  };
};

export const getCustomerRentalAnalytics = async (filters = {}) => {
  const { startDate, endDate, limit = 20, search } = filters;
  const bookingDateMatch = buildDateMatch(startDate, endDate, "createdAt");

  const matchQuery = {
    status: { $ne: "cancelled" },
    ...bookingDateMatch,
  };

  const customerStats = await Booking.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$customer",
        totalBookings: { $sum: 1 },
        totalSpend: { $sum: "$totalAmount" },
        activeRentals: {
          $sum: { $cond: [{ $eq: ["$status", "issued"] }, 1, 0] },
        },
        completedRentals: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "_id",
        foreignField: "_id",
        as: "customerDoc",
      },
    },
    { $unwind: { path: "$customerDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "invoices",
        localField: "_id",
        foreignField: "customer.customerId",
        as: "invoices",
      },
    },
    {
      $project: {
        customerId: "$_id",
        name: { $ifNull: ["$customerDoc.name", "Unknown Customer"] },
        phone: { $ifNull: ["$customerDoc.phone", ""] },
        email: { $ifNull: ["$customerDoc.email", ""] },
        totalBookings: 1,
        totalSpend: 1,
        activeRentals: 1,
        completedRentals: 1,
        outstandingBalance: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$invoices",
                  as: "inv",
                  cond: { $ne: ["$$inv.status", "cancelled"] },
                },
              },
              as: "i",
              in: "$$i.pricing.outstandingBalance",
            },
          },
        },
      },
    },
    { $sort: { totalSpend: -1, totalBookings: -1 } },
  ]);

  let filteredCustomers = customerStats;
  if (search) {
    const s = search.toLowerCase();
    filteredCustomers = customerStats.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.phone.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s)
    );
  }

  return {
    totalCustomers: filteredCustomers.length,
    customers: filteredCustomers.slice(0, limit),
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      limit,
      search: search || null,
    },
  };
};

export const getOutstandingPaymentsAnalytics = async (filters = {}) => {
  const { startDate, endDate } = filters;
  const invoiceDateMatch = buildDateMatch(startDate, endDate, "createdAt");
  const now = new Date();

  const invoices = await Invoice.find({
    status: { $nin: ["paid", "cancelled"] },
    "pricing.outstandingBalance": { $gt: 0 },
    ...invoiceDateMatch,
  })
    .populate("booking", "bookingNumber startDate endDate")
    .sort({ createdAt: -1 });

  let totalOutstanding = 0;
  const aging = {
    current0To30: 0,
    aging31To60: 0,
    aging61To90: 0,
    agingOver90: 0,
  };

  const detailedInvoices = invoices.map((inv) => {
    const balance = inv.pricing?.outstandingBalance || 0;
    totalOutstanding += balance;

    const ageDays = Math.floor(
      (now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (ageDays <= 30) {
      aging.current0To30 += balance;
    } else if (ageDays <= 60) {
      aging.aging31To60 += balance;
    } else if (ageDays <= 90) {
      aging.aging61To90 += balance;
    } else {
      aging.agingOver90 += balance;
    }

    return {
      invoiceId: inv._id,
      invoiceNumber: inv.invoiceNumber,
      bookingNumber: inv.booking?.bookingNumber || "",
      customerName: inv.customer?.name || "",
      customerPhone: inv.customer?.phone || "",
      invoiceDate: inv.createdAt,
      totalInvoiceAmount: inv.pricing?.totalInvoiceAmount || 0,
      totalPaid: inv.pricing?.totalPaid || 0,
      outstandingBalance: balance,
      ageDays,
      status: inv.status,
    };
  });

  return {
    totalOutstanding,
    unpaidInvoicesCount: invoices.length,
    agingBreakdown: aging,
    invoices: detailedInvoices,
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};

export const getMaintenanceAnalytics = async (filters = {}) => {
  const { startDate, endDate } = filters;
  const maintenanceDateMatch = buildDateMatch(startDate, endDate, "startDate");

  const [maintenanceByProduct, totalsAggregation, overallProducts] = await Promise.all([
    Maintenance.aggregate([
      { $match: { status: { $ne: "cancelled" }, ...maintenanceDateMatch } },
      {
        $group: {
          _id: "$product",
          totalCost: { $sum: "$cost" },
          eventsCount: { $sum: 1 },
          scheduledCount: {
            $sum: { $cond: [{ $eq: ["$maintenanceType", "scheduled"] }, 1, 0] },
          },
          correctiveCount: {
            $sum: { $cond: [{ $eq: ["$maintenanceType", "corrective"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: "$_id",
          productName: { $ifNull: ["$productDoc.name", "Unknown Product"] },
          sku: { $ifNull: ["$productDoc.sku", ""] },
          totalCost: 1,
          eventsCount: 1,
          scheduledCount: 1,
          correctiveCount: 1,
        },
      },
      { $sort: { totalCost: -1 } },
    ]),

    Maintenance.aggregate([
      { $match: { status: { $ne: "cancelled" }, ...maintenanceDateMatch } },
      {
        $group: {
          _id: null,
          totalMaintenanceCost: { $sum: "$cost" },
          totalEvents: { $sum: 1 },
        },
      },
    ]),

    Product.aggregate([
      {
        $group: {
          _id: null,
          totalFleetPurchaseValue: {
            $sum: { $multiply: ["$totalQuantity", "$purchasePrice"] },
          },
        },
      },
    ]),
  ]);

  const totalMaintenanceCost = totalsAggregation[0]?.totalMaintenanceCost || 0;
  const totalEvents = totalsAggregation[0]?.totalEvents || 0;
  const totalFleetPurchaseValue = overallProducts[0]?.totalFleetPurchaseValue || 0;

  const maintenanceCostRatio =
    totalFleetPurchaseValue > 0
      ? Math.round((totalMaintenanceCost / totalFleetPurchaseValue) * 10000) / 100
      : 0;

  return {
    totalMaintenanceCost,
    totalEvents,
    totalFleetPurchaseValue,
    maintenanceCostRatioPercentage: maintenanceCostRatio,
    byProduct: maintenanceByProduct,
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};

export const getTransportationRevenueAnalytics = async (filters = {}) => {
  const { startDate, endDate } = filters;
  const dateMatch = buildDateMatch(startDate, endDate, "createdAt");

  const [invoiceTransports, directTransports] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          "pricing.transportation.required": true,
          ...dateMatch,
        },
      },
      {
        $group: {
          _id: "$pricing.transportation.serviceType",
          totalArrangementFees: { $sum: "$pricing.transportation.arrangementFee" },
          totalPassThroughCost: { $sum: "$pricing.transportation.passThroughCost" },
          count: { $sum: 1 },
        },
      },
    ]),

    Transport.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          ...buildDateMatch(startDate, endDate, "scheduledDate"),
        },
      },
      {
        $group: {
          _id: "$paymentResponsibility",
          totalCost: { $sum: "$transportationCost" },
          totalArrangementFee: { $sum: "$arrangementFee" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  let totalArrangementRevenue = 0;
  let totalPassThroughSettlements = 0;
  let totalTransportJobs = 0;

  for (const item of invoiceTransports) {
    totalArrangementRevenue += item.totalArrangementFees;
    totalPassThroughSettlements += item.totalPassThroughCost;
    totalTransportJobs += item.count;
  }

  return {
    totalArrangementFeeRevenue: totalArrangementRevenue,
    totalPassThroughSettlements,
    totalTransportJobs,
    byServiceType: invoiceTransports.map((t) => ({
      serviceType: t._id || "delivery",
      arrangementFees: t.totalArrangementFees,
      passThroughCost: t.totalPassThroughCost,
      count: t.count,
    })),
    byPaymentResponsibility: directTransports.map((p) => ({
      responsibility: p._id,
      transportationCost: p.totalCost,
      arrangementFee: p.totalArrangementFee,
      count: p.count,
    })),
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  };
};
