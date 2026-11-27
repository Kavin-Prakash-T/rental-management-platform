import * as analyticsService from "./analyticsService.js";
import ApiError from "../utils/ApiError.js";

const escapeCsvField = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

const formatPaiseToRupees = (paise) => {
  const num = typeof paise === "number" ? paise : 0;
  return (num / 100).toFixed(2);
};

export const getRevenueReport = async (filters = {}) => {
  return await analyticsService.getRevenueAnalytics(filters);
};

export const getExpenseReport = async (filters = {}) => {
  return await analyticsService.getExpenseAnalytics(filters);
};

export const getProfitReport = async (filters = {}) => {
  return await analyticsService.getProfitAnalytics(filters);
};

export const getProductReport = async (filters = {}) => {
  return await analyticsService.getProductPerformanceAnalytics(filters);
};

export const getUtilizationReport = async (filters = {}) => {
  return await analyticsService.getEquipmentUtilizationAnalytics(filters);
};

export const getCustomerReport = async (filters = {}) => {
  return await analyticsService.getCustomerRentalAnalytics(filters);
};

export const getOutstandingReport = async (filters = {}) => {
  return await analyticsService.getOutstandingPaymentsAnalytics(filters);
};

export const getMaintenanceReport = async (filters = {}) => {
  return await analyticsService.getMaintenanceAnalytics(filters);
};

export const getTransportationReport = async (filters = {}) => {
  return await analyticsService.getTransportationRevenueAnalytics(filters);
};

export const generateReportCsv = async (reportType, filters = {}) => {
  let headers = [];
  let rows = [];

  switch (reportType) {
    case "revenue": {
      const data = await analyticsService.getRevenueAnalytics(filters);
      headers = [
        "Period",
        "Month",
        "Invoiced Rental Revenue (INR)",
        "Arrangement Fees (INR)",
        "Total Operating Revenue (INR)",
        "Cash Collected (INR)",
        "Invoice Count",
      ];
      rows = data.trends.map((t) => [
        t.period,
        t.monthName,
        formatPaiseToRupees(t.invoicedRentalRevenue),
        formatPaiseToRupees(t.arrangementFees),
        formatPaiseToRupees(t.totalOperatingRevenue),
        formatPaiseToRupees(t.cashCollected),
        t.invoiceCount,
      ]);
      break;
    }

    case "expenses": {
      const data = await analyticsService.getExpenseAnalytics(filters);
      headers = [
        "Category",
        "Total Amount (INR)",
        "Expense Count",
        "Percentage of Total (%)",
      ];
      rows = data.byCategory.map((c) => [
        c.category,
        formatPaiseToRupees(c.totalAmount),
        c.count,
        `${c.percentage}%`,
      ]);
      break;
    }

    case "profit": {
      const data = await analyticsService.getProfitAnalytics(filters);
      headers = [
        "Period",
        "Month",
        "Invoiced Revenue (INR)",
        "Cash Collected (INR)",
        "Operating Expenses (INR)",
        "Accrual Profit (INR)",
        "Cash Profit (INR)",
        "Accrual Margin (%)",
      ];
      rows = data.trends.map((t) => [
        t.period,
        t.monthName,
        formatPaiseToRupees(t.invoicedRevenue),
        formatPaiseToRupees(t.cashCollected),
        formatPaiseToRupees(t.expenses),
        formatPaiseToRupees(t.accrualProfit),
        formatPaiseToRupees(t.cashProfit),
        `${t.marginPercentage}%`,
      ]);
      break;
    }

    case "products": {
      const data = await analyticsService.getProductPerformanceAnalytics(filters);
      headers = [
        "Product Name",
        "SKU",
        "Category",
        "Total Quantity Rented",
        "Times Booked",
        "Total Revenue (INR)",
        "Current Stock",
      ];
      rows = data.mostRentedEquipment.map((p) => [
        p.name,
        p.sku,
        p.categoryName,
        p.totalQuantityRented,
        p.timesBooked,
        formatPaiseToRupees(p.totalRevenue),
        p.currentStock ?? "",
      ]);
      break;
    }

    case "utilization": {
      const data = await analyticsService.getEquipmentUtilizationAnalytics(filters);
      headers = [
        "Product Name",
        "SKU",
        "Category",
        "Total Units",
        "Period Days",
        "Capacity (Unit-Days)",
        "Rented (Unit-Days)",
        "Utilization Rate (%)",
      ];
      rows = data.products.map((p) => [
        p.name,
        p.sku,
        p.categoryName,
        p.totalQuantity,
        p.periodDays,
        p.capacityUnitDays,
        p.rentedUnitDays,
        `${p.utilizationPercentage}%`,
      ]);
      break;
    }

    case "customers": {
      const data = await analyticsService.getCustomerRentalAnalytics(filters);
      headers = [
        "Customer Name",
        "Phone",
        "Email",
        "Total Bookings",
        "Total Spend (INR)",
        "Active Rentals",
        "Completed Rentals",
        "Outstanding Balance (INR)",
      ];
      rows = data.customers.map((c) => [
        c.name,
        c.phone,
        c.email,
        c.totalBookings,
        formatPaiseToRupees(c.totalSpend),
        c.activeRentals,
        c.completedRentals,
        formatPaiseToRupees(c.outstandingBalance),
      ]);
      break;
    }

    case "outstanding": {
      const data = await analyticsService.getOutstandingPaymentsAnalytics(filters);
      headers = [
        "Invoice Number",
        "Booking Number",
        "Customer Name",
        "Customer Phone",
        "Invoice Date",
        "Total Amount (INR)",
        "Paid Amount (INR)",
        "Outstanding Balance (INR)",
        "Age (Days)",
        "Status",
      ];
      rows = data.invoices.map((inv) => [
        inv.invoiceNumber,
        inv.bookingNumber,
        inv.customerName,
        inv.customerPhone,
        new Date(inv.invoiceDate).toISOString().slice(0, 10),
        formatPaiseToRupees(inv.totalInvoiceAmount),
        formatPaiseToRupees(inv.totalPaid),
        formatPaiseToRupees(inv.outstandingBalance),
        inv.ageDays,
        inv.status,
      ]);
      break;
    }

    case "maintenance": {
      const data = await analyticsService.getMaintenanceAnalytics(filters);
      headers = [
        "Product Name",
        "SKU",
        "Total Maintenance Cost (INR)",
        "Events Count",
        "Scheduled Count",
        "Corrective Count",
      ];
      rows = data.byProduct.map((m) => [
        m.productName,
        m.sku,
        formatPaiseToRupees(m.totalCost),
        m.eventsCount,
        m.scheduledCount,
        m.correctiveCount,
      ]);
      break;
    }

    case "transportation": {
      const data = await analyticsService.getTransportationRevenueAnalytics(filters);
      headers = [
        "Service Type",
        "Arrangement Fees (INR)",
        "Pass-Through Cost (INR)",
        "Job Count",
      ];
      rows = data.byServiceType.map((t) => [
        t.serviceType,
        formatPaiseToRupees(t.arrangementFees),
        formatPaiseToRupees(t.passThroughCost),
        t.count,
      ]);
      break;
    }

    default:
      throw ApiError.badRequest(`Unsupported report export type: '${reportType}'`);
  }

  const csvHeader = headers.map(escapeCsvField).join(",");
  const csvRows = rows.map((r) => r.map(escapeCsvField).join(","));

  return [csvHeader, ...csvRows].join("\r\n");
};
