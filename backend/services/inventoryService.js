import Product from "../models/Product.js";
import Booking from "../models/Booking.js";
import Maintenance from "../models/Maintenance.js";
import ApiError from "../utils/ApiError.js";
import { calculateProductAvailability } from "./availabilityService.js";

export const getInventoryOverview = async (filters = {}) => {
  const {
    category,
    search,
    page = 1,
    limit = 10,
    sortBy = "name",
    sortOrder = "asc",
  } = filters;

  const query = { isActive: true };

  if (category) {
    query.category = category;
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ name: regex }, { sku: regex }];
  }

  const sort = {};
  const validSortFields = [
    "name",
    "sku",
    "totalQuantity",
    "availableQuantity",
    "reservedQuantity",
    "issuedQuantity",
    "maintenanceQuantity",
  ];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "name";
  sort[sortField] = sortOrder === "desc" ? -1 : 1;

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  const inventory = products.map((product) => {
    const committed =
      (product.reservedQuantity || 0) +
      (product.issuedQuantity || 0) +
      (product.maintenanceQuantity || 0) +
      (product.damagedQuantity || 0);

    const utilizationRate =
      product.totalQuantity > 0
        ? Math.round((committed / product.totalQuantity) * 100)
        : 0;

    return {
      _id: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      totalQuantity: product.totalQuantity,
      availableQuantity: product.availableQuantity,
      reservedQuantity: product.reservedQuantity,
      issuedQuantity: product.issuedQuantity,
      maintenanceQuantity: product.maintenanceQuantity,
      damagedQuantity: product.damagedQuantity,
      utilizationRate,
      condition: product.condition,
    };
  });

  return {
    inventory,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getProductInventoryDetail = async (productId, queryParams = {}) => {
  const product = await Product.findById(productId).populate("category", "name slug");

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  const [activeReservations, activeIssuances, ongoingMaintenance] = await Promise.all([
    Booking.find({
      "items.product": product._id,
      status: "confirmed",
    })
      .select("bookingNumber customer startDate endDate items")
      .populate("customer", "name phone"),

    Booking.find({
      "items.product": product._id,
      status: "issued",
    })
      .select("bookingNumber customer startDate endDate actualStartDate items")
      .populate("customer", "name phone"),

    Maintenance.find({
      product: product._id,
      status: { $in: ["scheduled", "in_progress"] },
    }).select("reason quantity status startDate endDate"),
  ]);

  let futureAvailability = null;
  if (queryParams.startDate && queryParams.endDate) {
    futureAvailability = await calculateProductAvailability(
      productId,
      queryParams.startDate,
      queryParams.endDate,
      1
    );
  }

  const committed =
    (product.reservedQuantity || 0) +
    (product.issuedQuantity || 0) +
    (product.maintenanceQuantity || 0) +
    (product.damagedQuantity || 0);

  const utilizationRate =
    product.totalQuantity > 0
      ? Math.round((committed / product.totalQuantity) * 100)
      : 0;

  return {
    product: {
      _id: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      totalQuantity: product.totalQuantity,
      availableQuantity: product.availableQuantity,
      reservedQuantity: product.reservedQuantity,
      issuedQuantity: product.issuedQuantity,
      maintenanceQuantity: product.maintenanceQuantity,
      damagedQuantity: product.damagedQuantity,
      utilizationRate,
      condition: product.condition,
      hourlyRate: product.hourlyRate,
      dailyRate: product.dailyRate,
      isActive: product.isActive,
    },
    activeReservations: activeReservations.map((b) => {
      const it = b.items.find((i) => i.product.toString() === product._id.toString());
      return {
        bookingId: b._id,
        bookingNumber: b.bookingNumber,
        customer: b.customer,
        startDate: b.startDate,
        endDate: b.endDate,
        reservedQuantity: it ? it.quantity : 0,
      };
    }),
    activeIssuances: activeIssuances.map((b) => {
      const it = b.items.find((i) => i.product.toString() === product._id.toString());
      const pendingReturn = it ? it.issuedQuantity - it.returnedQuantity : 0;
      return {
        bookingId: b._id,
        bookingNumber: b.bookingNumber,
        customer: b.customer,
        startDate: b.startDate,
        endDate: b.endDate,
        actualStartDate: b.actualStartDate,
        issuedQuantity: it ? it.issuedQuantity : 0,
        returnedQuantity: it ? it.returnedQuantity : 0,
        pendingReturnQuantity: pendingReturn,
        isOverdue: new Date() > b.endDate,
      };
    }),
    ongoingMaintenance,
    futureAvailability,
  };
};

export const getOverdueRentals = async () => {
  const now = new Date();

  const overdueBookings = await Booking.find({
    status: "issued",
    endDate: { $lt: now },
  })
    .populate("customer", "name phone email")
    .populate("items.product", "name sku");

  return overdueBookings.map((b) => {
    const overdueMs = now.getTime() - b.endDate.getTime();
    const overdueHours = Math.ceil(overdueMs / (1000 * 60 * 60));
    const overdueDays = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));

    const pendingItems = b.items
      .map((it) => {
        const pendingQty = (it.issuedQuantity || it.quantity) - (it.returnedQuantity || 0);
        return {
          product: it.product,
          name: it.name,
          sku: it.sku,
          issuedQuantity: it.issuedQuantity || it.quantity,
          returnedQuantity: it.returnedQuantity || 0,
          pendingQuantity: pendingQty,
        };
      })
      .filter((it) => it.pendingQuantity > 0);

    return {
      bookingId: b._id,
      bookingNumber: b.bookingNumber,
      customer: b.customer,
      startDate: b.startDate,
      scheduledEndDate: b.endDate,
      actualStartDate: b.actualStartDate,
      overdueHours,
      overdueDays,
      unreturnedItems: pendingItems,
    };
  });
};
