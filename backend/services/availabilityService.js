import mongoose from "mongoose";
import Product from "../models/Product.js";
import Booking from "../models/Booking.js";
import Maintenance from "../models/Maintenance.js";
import ApiError from "../utils/ApiError.js";

export const calculateProductAvailability = async (
  productId,
  requestedStart,
  requestedEnd,
  requestedQuantity = 1,
  session = null
) => {
  const product = await Product.findById(productId).session(session);

  if (!product) {
    throw ApiError.notFound(`Product with ID '${productId}' was not found`);
  }

  if (!product.isActive) {
    return {
      product: product._id,
      name: product.name,
      sku: product.sku,
      totalQuantity: product.totalQuantity,
      requestedQuantity,
      availableQuantity: 0,
      peakReservedQuantity: product.totalQuantity,
      shortage: requestedQuantity,
      isAvailable: false,
      reason: "Product is inactive",
    };
  }

  const reqStart = new Date(requestedStart);
  const reqEnd = new Date(requestedEnd);
  const now = new Date();

  const [overlappingBookings, overlappingMaintenance] = await Promise.all([
    Booking.find({
      "items.product": product._id,
      status: { $in: ["confirmed", "issued", "partially_returned"] },
      $or: [
        {
          startDate: { $lt: reqEnd },
          endDate: { $gt: reqStart },
        },
        {
          status: { $in: ["issued", "partially_returned"] },
          actualReturnDate: null,
          endDate: { $lte: now },
        },
      ],
    }).session(session),

    Maintenance.find({
      product: product._id,
      status: { $in: ["scheduled", "in_progress"] },
      $or: [
        {
          startDate: { $lt: reqEnd },
          endDate: { $gt: reqStart },
        },
        {
          status: "in_progress",
          actualReturnDate: null,
          endDate: { $lte: now },
        },
      ],
    }).session(session),
  ]);

  let constantDeficit = product.damagedQuantity || 0;
  const events = [];

  for (const booking of overlappingBookings) {
    const matchedItem = booking.items.find(
      (item) => item.product.toString() === product._id.toString()
    );
    const qty = matchedItem ? matchedItem.quantity : 0;
    if (qty <= 0) continue;

    const isIssued = ["issued", "partially_returned"].includes(booking.status);
    const isUnreturned = !booking.actualReturnDate;
    const isOverdue = isIssued && isUnreturned && booking.endDate <= now;

    if (isOverdue) {
      constantDeficit += qty;
    } else {
      const effectiveStart = booking.startDate < reqStart ? reqStart : booking.startDate;
      const effectiveEnd = booking.endDate > reqEnd ? reqEnd : booking.endDate;

      if (effectiveStart < effectiveEnd) {
        events.push({
          time: new Date(effectiveStart).getTime(),
          delta: qty,
          type: "start",
        });
        events.push({
          time: new Date(effectiveEnd).getTime(),
          delta: -qty,
          type: "end",
        });
      }
    }
  }

  for (const maint of overlappingMaintenance) {
    const qty = maint.quantity || 1;
    const isInProgress = maint.status === "in_progress";
    const isUnreturned = !maint.actualReturnDate;
    const isOverdue = isInProgress && isUnreturned && maint.endDate <= now;

    if (isOverdue) {
      constantDeficit += qty;
    } else {
      const effectiveStart = maint.startDate < reqStart ? reqStart : maint.startDate;
      const effectiveEnd = maint.endDate > reqEnd ? reqEnd : maint.endDate;

      if (effectiveStart < effectiveEnd) {
        events.push({
          time: new Date(effectiveStart).getTime(),
          delta: qty,
          type: "start",
        });
        events.push({
          time: new Date(effectiveEnd).getTime(),
          delta: -qty,
          type: "end",
        });
      }
    }
  }

  events.sort((a, b) => {
    if (a.time !== b.time) {
      return a.time - b.time;
    }
    if (a.type === "end" && b.type === "start") return -1;
    if (a.type === "start" && b.type === "end") return 1;
    return 0;
  });

  let currentReserved = 0;
  let peakDynamicReserved = 0;

  for (const event of events) {
    currentReserved += event.delta;
    if (currentReserved > peakDynamicReserved) {
      peakDynamicReserved = currentReserved;
    }
  }

  const peakReservedQuantity = constantDeficit + peakDynamicReserved;
  const availableQuantity = Math.max(0, product.totalQuantity - peakReservedQuantity);
  const shortage = Math.max(0, requestedQuantity - availableQuantity);
  const isAvailable = shortage === 0;

  return {
    product: product._id,
    name: product.name,
    sku: product.sku,
    totalQuantity: product.totalQuantity,
    requestedQuantity,
    availableQuantity,
    peakReservedQuantity,
    shortage,
    isAvailable,
  };
};

export const checkAvailability = async ({ items, startDate, endDate }, options = {}) => {
  const reqStart = new Date(startDate);
  const reqEnd = new Date(endDate);

  if (isNaN(reqStart.getTime()) || isNaN(reqEnd.getTime())) {
    throw ApiError.badRequest("Invalid date format provided for availability check");
  }

  if (reqStart >= reqEnd) {
    throw ApiError.badRequest("End date must be strictly after start date");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest("At least one equipment item is required for availability check");
  }

  const aggregatedItemsMap = new Map();
  for (const item of items) {
    const prodId = item.product.toString();
    const existing = aggregatedItemsMap.get(prodId) || 0;
    aggregatedItemsMap.set(prodId, existing + Number(item.quantity));
  }

  const results = [];
  let allAvailable = true;

  for (const [prodId, totalRequestedQty] of aggregatedItemsMap.entries()) {
    const itemAvailability = await calculateProductAvailability(
      prodId,
      reqStart,
      reqEnd,
      totalRequestedQty,
      options.session
    );

    if (!itemAvailability.isAvailable) {
      allAvailable = false;
    }

    results.push(itemAvailability);
  }

  return {
    startDate: reqStart.toISOString(),
    endDate: reqEnd.toISOString(),
    isAvailable: allAvailable,
    items: results,
  };
};

export const withInventoryTransaction = async (operation) => {
  if (mongoose.connection.readyState !== 1) {
    const mockSession = {
      inTransaction: () => false,
      startTransaction: () => {},
      commitTransaction: async () => {},
      abortTransaction: async () => {},
      endSession: async () => {},
    };
    return await operation(mockSession);
  }

  const session = await mongoose.startSession();
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      session.startTransaction();
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      const isTransient =
        error?.hasErrorLabel?.("TransientTransactionError") ||
        error?.code === 112 ||
        error?.codeName === "WriteConflict";

      if (isTransient && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 50));
        continue;
      }
      throw error;
    } finally {
      if (attempt === maxRetries || !session.inTransaction()) {
        await session.endSession();
      }
    }
  }
};
