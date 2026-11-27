import Product from "../models/Product.js";
import Booking from "../models/Booking.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import Expense from "../models/Expense.js";

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

export const getDashboardSummary = async (filters = {}) => {
  const { startDate, endDate, year } = filters;
  const now = new Date();

  const selectedYear = year || now.getFullYear();
  const yearStart = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0, 0));
  const yearEnd = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59, 999));

  let dateMatch = {};
  if (startDate || endDate) {
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) dateMatch.$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) dateMatch.$lte = e;
    }
  }

  const hasDateFilter = Object.keys(dateMatch).length > 0;

  const [
    productAggregation,
    bookingStatsAggregation,
    invoiceTotalsAggregation,
    paymentsAggregation,
    depositsLiabilityAggregation,
    expensesAggregation,
    monthlyInvoicesAggregation,
    monthlyPaymentsAggregation,
    monthlyExpensesAggregation,
    monthlyBookingsAggregation,
  ] = await Promise.all([
    Product.aggregate([
      {
        $group: {
          _id: null,
          totalEquipment: { $sum: "$totalQuantity" },
          totalAvailable: { $sum: "$availableQuantity" },
          totalReserved: { $sum: "$reservedQuantity" },
          totalIssued: { $sum: "$issuedQuantity" },
          totalMaintenance: { $sum: "$maintenanceQuantity" },
          totalDamaged: { $sum: "$damagedQuantity" },
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
        },
      },
    ]),

    Booking.aggregate([
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          activeRentals: {
            $sum: { $cond: [{ $eq: ["$status", "issued"] }, 1, 0] },
          },
          confirmedRentals: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          overdueRentals: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "issued"] },
                    { $lt: ["$endDate", now] },
                    { $eq: ["$actualReturnDate", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    Invoice.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          ...(hasDateFilter ? { createdAt: dateMatch } : {}),
        },
      },
      {
        $group: {
          _id: null,
          invoicedRentalRevenue: { $sum: "$pricing.rentalRevenue" },
          transportArrangementFees: {
            $sum: { $ifNull: ["$pricing.transportation.arrangementFee", 0] },
          },
          outstandingBalances: { $sum: "$pricing.outstandingBalance" },
          totalInvoicedCount: { $sum: 1 },
        },
      },
    ]),

    Payment.aggregate([
      {
        $match: {
          status: "verified",
          purpose: { $in: ["advance", "rental"] },
          ...(hasDateFilter ? { paymentDate: dateMatch } : {}),
        },
      },
      {
        $group: {
          _id: null,
          verifiedCashCollected: { $sum: "$amount" },
          collectionsCount: { $sum: 1 },
        },
      },
    ]),

    Payment.aggregate([
      {
        $match: {
          status: { $in: ["verified", "refunded"] },
          purpose: { $in: ["deposit", "refund"] },
        },
      },
      {
        $group: {
          _id: "$purpose",
          total: { $sum: "$amount" },
        },
      },
    ]),

    Expense.aggregate([
      {
        $match: {
          status: "active",
          isVoided: { $ne: true },
          ...(hasDateFilter ? { date: dateMatch } : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalOperatingExpenses: { $sum: "$amount" },
          expensesCount: { $sum: 1 },
        },
      },
    ]),

    Invoice.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          createdAt: { $gte: yearStart, $lte: yearEnd },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          revenue: {
            $sum: {
              $add: [
                "$pricing.rentalRevenue",
                { $ifNull: ["$pricing.transportation.arrangementFee", 0] },
              ],
            },
          },
        },
      },
    ]),

    Payment.aggregate([
      {
        $match: {
          status: "verified",
          purpose: { $in: ["advance", "rental"] },
          paymentDate: { $gte: yearStart, $lte: yearEnd },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$paymentDate" } },
          collected: { $sum: "$amount" },
        },
      },
    ]),

    Expense.aggregate([
      {
        $match: {
          status: "active",
          isVoided: { $ne: true },
          date: { $gte: yearStart, $lte: yearEnd },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$date" } },
          expenses: { $sum: "$amount" },
        },
      },
    ]),

    Booking.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          createdAt: { $gte: yearStart, $lte: yearEnd },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const prodStats = productAggregation[0] || {};
  const totalEquipment = prodStats.totalEquipment || 0;
  const activeProducts = prodStats.activeProducts || 0;
  const totalProducts = prodStats.totalProducts || 0;
  const availableQuantity = prodStats.totalAvailable || 0;
  const reservedQuantity = prodStats.totalReserved || 0;
  const issuedQuantity = prodStats.totalIssued || 0;
  const maintenanceQuantity = prodStats.totalMaintenance || 0;
  const damagedQuantity = prodStats.totalDamaged || 0;

  const bookStats = bookingStatsAggregation[0] || {};
  const activeRentals = bookStats.activeRentals || 0;
  const confirmedRentals = bookStats.confirmedRentals || 0;
  const overdueRentals = bookStats.overdueRentals || 0;
  const totalBookings = bookStats.totalBookings || 0;

  const invStats = invoiceTotalsAggregation[0] || {};
  const rawRentalRevenue = invStats.invoicedRentalRevenue || 0;
  const arrangementFees = invStats.transportArrangementFees || 0;
  const invoicedRentalRevenue = rawRentalRevenue + arrangementFees;
  const outstandingInvoiceBalances = invStats.outstandingBalances || 0;

  const payStats = paymentsAggregation[0] || {};
  const verifiedCashCollected = payStats.verifiedCashCollected || 0;

  let totalDepositsTaken = 0;
  let totalDepositsRefunded = 0;
  for (const item of depositsLiabilityAggregation) {
    if (item._id === "deposit") totalDepositsTaken = item.total;
    if (item._id === "refund") totalDepositsRefunded = item.total;
  }
  const refundableDepositsHeld = Math.max(0, totalDepositsTaken - totalDepositsRefunded);

  const expStats = expensesAggregation[0] || {};
  const monthlyOperatingExpenses = expStats.totalOperatingExpenses || 0;

  const operatingProfitAccrual = invoicedRentalRevenue - monthlyOperatingExpenses;
  const operatingProfitCash = verifiedCashCollected - monthlyOperatingExpenses;

  const monthlyRevMap = new Map();
  for (const item of monthlyInvoicesAggregation) {
    monthlyRevMap.set(item._id.month, item.revenue);
  }

  const monthlyPayMap = new Map();
  for (const item of monthlyPaymentsAggregation) {
    monthlyPayMap.set(item._id.month, item.collected);
  }

  const monthlyExpMap = new Map();
  for (const item of monthlyExpensesAggregation) {
    monthlyExpMap.set(item._id.month, item.expenses);
  }

  const monthlyBookMap = new Map();
  for (const item of monthlyBookingsAggregation) {
    monthlyBookMap.set(item._id.month, item.count);
  }

  const monthlyTrends = [];
  for (let m = 1; m <= 12; m++) {
    const rev = monthlyRevMap.get(m) || 0;
    const cash = monthlyPayMap.get(m) || 0;
    const exp = monthlyExpMap.get(m) || 0;
    const books = monthlyBookMap.get(m) || 0;
    monthlyTrends.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      year: selectedYear,
      invoicedRentalRevenue: rev,
      verifiedCashCollected: cash,
      operatingExpenses: exp,
      operatingProfit: rev - exp,
      cashOperatingProfit: cash - exp,
      bookingCount: books,
    });
  }

  return {
    equipment: {
      totalEquipment,
      activeProducts,
      totalProducts,
    },
    quantities: {
      available: availableQuantity,
      reserved: reservedQuantity,
      issued: issuedQuantity,
      maintenance: maintenanceQuantity,
      damaged: damagedQuantity,
    },
    rentals: {
      activeRentals,
      confirmedRentals,
      overdueRentals,
      totalBookings,
    },
    financials: {
      invoicedRentalRevenue,
      verifiedPaymentsCollected: verifiedCashCollected,
      outstandingInvoiceBalances,
      monthlyOperatingExpenses,
      operatingProfit: operatingProfitAccrual,
      cashOperatingProfit: operatingProfitCash,
      refundableDepositsHeld,
      accountingBasis: {
        method: "Accrual & Cash Distinction",
        operatingRevenueDefinition:
          "Rental revenue recognizes billed rental services and shop transportation arrangement fees while strictly excluding customer refundable deposits and pass-through third-party transportation settlements.",
        accrualProfitDefinition: "Invoiced rental revenue minus active operating expenses.",
        cashProfitDefinition: "Verified cash collections minus active operating expenses.",
        depositHandling:
          "Refundable deposits are treated strictly as balance sheet liabilities and are excluded from operating income.",
      },
    },
    monthlyTrends,
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      year: selectedYear,
    },
  };
};

export const getDashboardActivity = async (filters = {}) => {
  const { limit = 10 } = filters;
  const now = new Date();

  const [
    recentBookings,
    upcomingReturns,
    overdueRentals,
    recentPayments,
    recentExpenses,
  ] = await Promise.all([
    Booking.find()
      .populate("customer", "name phone email")
      .populate("items.product", "name sku")
      .sort({ createdAt: -1 })
      .limit(limit),

    Booking.find({
      status: "issued",
      endDate: { $gte: now },
      actualReturnDate: null,
    })
      .populate("customer", "name phone email")
      .populate("items.product", "name sku")
      .sort({ endDate: 1 })
      .limit(limit),

    Booking.find({
      status: "issued",
      endDate: { $lt: now },
      actualReturnDate: null,
    })
      .populate("customer", "name phone email")
      .populate("items.product", "name sku")
      .sort({ endDate: 1 })
      .limit(limit),

    Payment.find({ status: "verified" })
      .populate("booking", "bookingNumber startDate endDate")
      .populate("invoice", "invoiceNumber status")
      .populate("verifiedBy", "name email")
      .sort({ paymentDate: -1 })
      .limit(limit),

    Expense.find({ status: "active" })
      .populate("createdBy", "name email")
      .sort({ date: -1 })
      .limit(limit),
  ]);

  const formattedOverdue = overdueRentals.map((booking) => {
    const end = new Date(booking.endDate);
    const overdueMs = Math.max(0, now.getTime() - end.getTime());
    const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
    const overdueDays = Math.floor(overdueHours / 24);

    return {
      _id: booking._id,
      bookingNumber: booking.bookingNumber,
      customer: booking.customer,
      items: booking.items,
      startDate: booking.startDate,
      endDate: booking.endDate,
      overdueHours,
      overdueDays,
    };
  });

  return {
    recentBookings,
    upcomingReturns,
    overdueRentals: formattedOverdue,
    recentPayments,
    recentExpenses,
  };
};
