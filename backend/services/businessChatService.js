import * as analyticsService from "./analyticsService.js";
import * as dashboardService from "./dashboardService.js";

export const serviceAdapters = {
  getProfitAnalytics: analyticsService.getProfitAnalytics,
  getExpenseAnalytics: analyticsService.getExpenseAnalytics,
  getProductPerformanceAnalytics: analyticsService.getProductPerformanceAnalytics,
  getEquipmentUtilizationAnalytics: analyticsService.getEquipmentUtilizationAnalytics,
  getOutstandingPaymentsAnalytics: analyticsService.getOutstandingPaymentsAnalytics,
  getDashboardSummary: dashboardService.getDashboardSummary,
};

const ALLOWED_TOOLS = new Set([
  "get_profit_summary",
  "compare_monthly_profit",
  "get_top_revenue_equipment",
  "get_underutilized_equipment",
  "get_expense_breakdown",
  "get_outstanding_receivables",
  "get_dashboard_overview",
]);

const parsePeriodDates = (period) => {
  const now = new Date();
  if (period === "this_month") {
    const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  if (period === "last_month") {
    const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  if (period === "this_year") {
    const start = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  return { startDate: null, endDate: null };
};

export const businessToolsDefinition = [
  {
    type: "function",
    function: {
      name: "get_profit_summary",
      description: "Get financial summary including operating revenue, cash collected, operating expenses, and accrual/cash operating profits for a given period or date range.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["this_month", "last_month", "this_year", "custom"],
            description: "Predefined period. Defaults to this_month if dates are not specified.",
          },
          startDate: {
            type: "string",
            description: "ISO date string for start of custom period (YYYY-MM-DD).",
          },
          endDate: {
            type: "string",
            description: "ISO date string for end of custom period (YYYY-MM-DD).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_monthly_profit",
      description: "Compare financial performance and operating profit between two periods (e.g. this month vs last month). Calculates exact revenue delta, expense delta, category shifts, and profit variances.",
      parameters: {
        type: "object",
        properties: {
          period1: {
            type: "string",
            description: "Base period name or ISO month string, defaults to 'last_month'.",
          },
          period2: {
            type: "string",
            description: "Comparison period name or ISO month string, defaults to 'this_month'.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_revenue_equipment",
      description: "Get rental equipment generating the highest revenue, rental frequencies, and category-wise rental performance.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of items to return (1 to 10). Default 5.",
          },
          startDate: {
            type: "string",
            description: "Optional start date filter (YYYY-MM-DD).",
          },
          endDate: {
            type: "string",
            description: "Optional end date filter (YYYY-MM-DD).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_underutilized_equipment",
      description: "Get equipment items with lowest utilization rate, idle capacity, and rented unit-days over total available unit-days.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of items to return (1 to 10). Default 5.",
          },
          startDate: {
            type: "string",
            description: "Optional start date filter (YYYY-MM-DD).",
          },
          endDate: {
            type: "string",
            description: "Optional end date filter (YYYY-MM-DD).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_expense_breakdown",
      description: "Get operating expenses grouped by category (salaries, rent, maintenance, fuel, electricity, equipment purchases, etc.) and category proportions.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["this_month", "last_month", "this_year", "custom"],
          },
          startDate: {
            type: "string",
            description: "Optional start date filter (YYYY-MM-DD).",
          },
          endDate: {
            type: "string",
            description: "Optional end date filter (YYYY-MM-DD).",
          },
          category: {
            type: "string",
            description: "Specific expense category to filter.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_outstanding_receivables",
      description: "Get summary of unpaid customer invoices, total outstanding balances, and aging brackets (0-30, 31-60, 61-90, 90+ days). Contains minimized customer identification.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of overdue invoices to list. Default 10.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_overview",
      description: "Get comprehensive business overview including inventory fleet status, active bookings, monthly revenue, monthly expenses, and deposits held.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const executeAnalyticsTool = async (name, args = {}) => {
  if (!ALLOWED_TOOLS.has(name)) {
    return {
      error: `Tool '${name}' is not in the allowlist of read-only business analytics functions.`,
    };
  }

  try {
    switch (name) {
      case "get_profit_summary": {
        let { startDate, endDate, period } = args;
        if (!startDate && !endDate) {
          const parsed = parsePeriodDates(period || "this_month");
          startDate = parsed.startDate;
          endDate = parsed.endDate;
        }

        const data = await serviceAdapters.getProfitAnalytics({ startDate, endDate });
        return {
          period: period || "custom",
          dateRange: { startDate: startDate || "all-time", endDate: endDate || "now" },
          totalInvoicedRevenue: data.totalInvoicedRevenue,
          totalCashCollected: data.totalCashCollected,
          totalOperatingExpenses: data.totalExpenses,
          operatingProfitAccrual: data.operatingProfitAccrual,
          operatingProfitCash: data.operatingProfitCash,
          accrualMarginPercentage: data.accrualMarginPercentage,
          cashMarginPercentage: data.cashMarginPercentage,
          accountingNote: "Excludes refundable customer deposits and pass-through transport costs.",
        };
      }

      case "compare_monthly_profit": {
        const lastMonthRange = parsePeriodDates("last_month");
        const thisMonthRange = parsePeriodDates("this_month");

        const [m1Profit, m2Profit, m1Expense, m2Expense] = await Promise.all([
          serviceAdapters.getProfitAnalytics(lastMonthRange),
          serviceAdapters.getProfitAnalytics(thisMonthRange),
          serviceAdapters.getExpenseAnalytics(lastMonthRange),
          serviceAdapters.getExpenseAnalytics(thisMonthRange),
        ]);

        const revenueDelta = m2Profit.totalInvoicedRevenue - m1Profit.totalInvoicedRevenue;
        const revenuePctChange =
          m1Profit.totalInvoicedRevenue > 0
            ? Math.round((revenueDelta / m1Profit.totalInvoicedRevenue) * 10000) / 100
            : m2Profit.totalInvoicedRevenue > 0
            ? 100
            : 0;

        const expenseDelta = m2Profit.totalExpenses - m1Profit.totalExpenses;
        const expensePctChange =
          m1Profit.totalExpenses > 0
            ? Math.round((expenseDelta / m1Profit.totalExpenses) * 10000) / 100
            : m2Profit.totalExpenses > 0
            ? 100
            : 0;

        const profitDeltaAccrual = m2Profit.operatingProfitAccrual - m1Profit.operatingProfitAccrual;
        const profitDeltaCash = m2Profit.operatingProfitCash - m1Profit.operatingProfitCash;

        const categoryComparison = [];
        const m1CatMap = new Map((m1Expense.categoryBreakdown || []).map((c) => [c.category, c.totalAmount]));
        const m2CatMap = new Map((m2Expense.categoryBreakdown || []).map((c) => [c.category, c.totalAmount]));
        const allCats = new Set([...m1CatMap.keys(), ...m2CatMap.keys()]);

        for (const cat of allCats) {
          const val1 = m1CatMap.get(cat) || 0;
          const val2 = m2CatMap.get(cat) || 0;
          const delta = val2 - val1;
          categoryComparison.push({
            category: cat,
            lastMonthAmount: val1,
            thisMonthAmount: val2,
            delta,
            direction: delta > 0 ? "increased" : delta < 0 ? "decreased" : "unchanged",
          });
        }

        categoryComparison.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

        return {
          lastMonth: {
            invoicedRevenue: m1Profit.totalInvoicedRevenue,
            cashCollected: m1Profit.totalCashCollected,
            expenses: m1Profit.totalExpenses,
            accrualProfit: m1Profit.operatingProfitAccrual,
            cashProfit: m1Profit.operatingProfitCash,
            marginPercentage: m1Profit.accrualMarginPercentage,
          },
          thisMonth: {
            invoicedRevenue: m2Profit.totalInvoicedRevenue,
            cashCollected: m2Profit.totalCashCollected,
            expenses: m2Profit.totalExpenses,
            accrualProfit: m2Profit.operatingProfitAccrual,
            cashProfit: m2Profit.operatingProfitCash,
            marginPercentage: m2Profit.accrualMarginPercentage,
          },
          varianceAnalysis: {
            revenueDelta,
            revenuePercentageChange: revenuePctChange,
            expenseDelta,
            expensePercentageChange: expensePctChange,
            profitDeltaAccrual,
            profitDeltaCash,
            primaryDrivers: categoryComparison.slice(0, 5),
          },
        };
      }

      case "get_top_revenue_equipment": {
        const limit = Math.min(Math.max(1, Number(args.limit) || 5), 10);
        const data = await serviceAdapters.getProductPerformanceAnalytics({
          startDate: args.startDate,
          endDate: args.endDate,
          limit,
        });

        const topItems = (data.mostRentedEquipment || []).slice(0, limit).map((item) => ({
          name: item.name,
          sku: item.sku,
          categoryName: item.categoryName,
          totalRevenue: item.totalRevenue,
          totalQuantityRented: item.totalQuantityRented,
          timesBooked: item.timesBooked,
        }));

        return {
          topEquipment: topItems,
          categoryPerformance: data.categoryPerformance || [],
        };
      }

      case "get_underutilized_equipment": {
        const limit = Math.min(Math.max(1, Number(args.limit) || 5), 10);
        const data = await serviceAdapters.getEquipmentUtilizationAnalytics({
          startDate: args.startDate,
          endDate: args.endDate,
        });

        const items = (data.productUtilization || [])
          .sort((a, b) => a.utilizationPercentage - b.utilizationPercentage)
          .slice(0, limit)
          .map((prod) => ({
            name: prod.name,
            sku: prod.sku,
            categoryName: prod.categoryName,
            utilizationPercentage: prod.utilizationPercentage,
            capacityUnitDays: prod.capacityUnitDays,
            rentedUnitDays: prod.rentedUnitDays,
            totalQuantity: prod.totalQuantity,
            availableQuantity: prod.availableQuantity,
          }));

        return {
          overallFleetUtilizationRate: data.overallFleetUtilizationRate,
          underutilizedEquipment: items,
          periodDays: data.periodDays,
        };
      }

      case "get_expense_breakdown": {
        let { startDate, endDate, period, category } = args;
        if (!startDate && !endDate && period) {
          const parsed = parsePeriodDates(period);
          startDate = parsed.startDate;
          endDate = parsed.endDate;
        }

        const data = await serviceAdapters.getExpenseAnalytics({
          startDate,
          endDate,
          category,
        });

        const totalExpenses = data.totalExpenses || 0;
        const categories = (data.categoryBreakdown || []).map((cat) => ({
          category: cat.category,
          amount: cat.totalAmount,
          count: cat.count,
          percentageOfTotal:
            totalExpenses > 0
              ? Math.round((cat.totalAmount / totalExpenses) * 10000) / 100
              : 0,
        }));

        return {
          totalOperatingExpenses: totalExpenses,
          categories,
          dateRange: { startDate: startDate || "all-time", endDate: endDate || "now" },
        };
      }

      case "get_outstanding_receivables": {
        const limit = Math.min(Math.max(1, Number(args.limit) || 10), 20);
        const data = await serviceAdapters.getOutstandingPaymentsAnalytics({});

        const maskedInvoices = (data.invoices || []).slice(0, limit).map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName || "Customer",
          invoiceDate: inv.invoiceDate,
          totalAmount: inv.totalInvoiceAmount,
          paidAmount: inv.totalPaid,
          outstandingBalance: inv.outstandingBalance,
          ageDays: inv.ageDays,
          status: inv.status,
        }));

        return {
          totalOutstandingBalance: data.totalOutstandingBalance || 0,
          agingSummary: data.agingBreakdown || {},
          overdueInvoices: maskedInvoices,
        };
      }

      case "get_dashboard_overview": {
        const data = await serviceAdapters.getDashboardSummary({});
        return {
          equipment: {
            totalCount: data.equipment?.totalEquipment || 0,
            activeCount: data.equipment?.activeEquipment || 0,
            available: data.equipment?.availableQuantity || 0,
            reserved: data.equipment?.reservedQuantity || 0,
            issued: data.equipment?.issuedQuantity || 0,
            maintenance: data.equipment?.maintenanceQuantity || 0,
          },
          rentals: {
            activeRentals: data.rentals?.activeRentals || 0,
            overdueRentals: data.rentals?.overdueRentals || 0,
          },
          finances: {
            monthlyInvoicedRentalRevenue: data.finances?.monthlyInvoicedRevenue || 0,
            monthlyVerifiedCollections: data.finances?.monthlyVerifiedPayments || 0,
            monthlyOperatingExpenses: data.finances?.monthlyOperatingExpenses || 0,
            operatingProfitAccrual: data.finances?.operatingProfitAccrual || 0,
            operatingProfitCash: data.finances?.operatingProfitCash || 0,
            refundableDepositsHeld: data.finances?.refundableDepositsHeld || 0,
          },
        };
      }

      default:
        return { error: `Unhandled tool '${name}'` };
    }
  } catch (error) {
    return {
      error: `Error executing analytics function '${name}': ${error.message}`,
    };
  }
};

export const detectIntentTool = (message = "") => {
  const lower = message.toLowerCase();

  if (
    (lower.includes("compare") || lower.includes("decrease") || lower.includes("why did profit") || lower.includes("last month")) &&
    lower.includes("profit")
  ) {
    return { name: "compare_monthly_profit", args: {} };
  }

  if (lower.includes("profit") || lower.includes("margin")) {
    return { name: "get_profit_summary", args: { period: "this_month" } };
  }

  if (
    lower.includes("equipment") &&
    (lower.includes("most revenue") || lower.includes("highest revenue") || lower.includes("top") || lower.includes("best"))
  ) {
    return { name: "get_top_revenue_equipment", args: { limit: 5 } };
  }

  if (lower.includes("underutiliz") || lower.includes("idle") || lower.includes("least rented") || lower.includes("utilization")) {
    return { name: "get_underutilized_equipment", args: { limit: 5 } };
  }

  if (lower.includes("outstanding") || lower.includes("unpaid") || lower.includes("receivable") || lower.includes("owe")) {
    return { name: "get_outstanding_receivables", args: { limit: 10 } };
  }

  if (lower.includes("expense") || lower.includes("spending") || lower.includes("cost") || lower.includes("highest operating")) {
    return { name: "get_expense_breakdown", args: { period: "this_month" } };
  }

  if (lower.includes("improve") || lower.includes("profitability") || lower.includes("recommend") || lower.includes("strategy")) {
    return { name: "get_dashboard_overview", args: {} };
  }

  return null;
};
