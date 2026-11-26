import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Settings from "../models/Settings.js";
import ApiError from "../utils/ApiError.js";
import {
  calculateProductAvailability,
  withInventoryTransaction,
} from "./availabilityService.js";

export const generateBookingNumber = async () => {
  let exists = true;
  let bookingNumber = "";
  let attempts = 0;
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  while (exists && attempts < 10) {
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    bookingNumber = `BK-${datePart}-${randomPart}`;
    exists = await Booking.findOne({ bookingNumber });
    attempts++;
  }

  return bookingNumber;
};

export const calculateBookingPricing = async (
  itemsInput,
  startDate,
  endDate,
  rentalType = "daily",
  customDiscount = 0,
  customDeposit = null,
  transportation = null,
  session = null
) => {
  const reqStart = new Date(startDate);
  const reqEnd = new Date(endDate);
  const diffMs = reqEnd.getTime() - reqStart.getTime();

  let duration = 1;
  if (rentalType === "hourly") {
    duration = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  } else {
    duration = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const settings = await Settings.findOne().session(session);

  const processedItems = [];
  let subtotal = 0;

  for (const item of itemsInput) {
    const product = await Product.findById(item.product).session(session);
    if (!product) {
      throw ApiError.notFound(`Equipment product '${item.product}' does not exist`);
    }

    if (!product.isActive) {
      throw ApiError.badRequest(`Equipment product '${product.name}' is inactive`);
    }

    let appliedRate = product.dailyRate;
    if (rentalType === "hourly") {
      appliedRate = product.hourlyRate > 0 ? product.hourlyRate : Math.ceil(product.dailyRate / 24);
    }

    const itemSubtotal = item.quantity * appliedRate * duration;
    subtotal += itemSubtotal;

    processedItems.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      quantity: item.quantity,
      rateSnapshot: {
        dailyRate: product.dailyRate,
        hourlyRate: product.hourlyRate,
        appliedRate,
        rentalType,
      },
      subtotal: itemSubtotal,
    });
  }

  const discount = Math.min(subtotal, Math.max(0, customDiscount || 0));
  const taxableAmount = Math.max(0, subtotal - discount);

  let totalTax = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const taxRate = 18;

  if (settings?.taxConfig?.enabled !== false) {
    totalTax = Math.round((taxableAmount * taxRate) / 100);
    cgst = Math.round(totalTax / 2);
    sgst = totalTax - cgst;
  }

  let refundableDeposit = 0;
  if (customDeposit !== null && customDeposit !== undefined) {
    refundableDeposit = Math.max(0, customDeposit);
  } else if (settings?.depositConfig) {
    if (settings.depositConfig.type === "percentage") {
      refundableDeposit = Math.round((taxableAmount * (settings.depositConfig.value || 20)) / 100);
    } else {
      refundableDeposit = settings.depositConfig.value || 0;
    }
  }

  const transportationFee = Math.max(0, transportation?.fee || 0);
  const totalAmount = taxableAmount + totalTax + transportationFee + refundableDeposit;

  return {
    items: processedItems,
    duration,
    rentalType,
    subtotal,
    discount,
    tax: {
      rate: taxRate,
      cgst,
      sgst,
      igst,
      totalTax,
    },
    refundableDeposit,
    transportationFee,
    totalAmount,
  };
};

export const createBooking = async (bookingData) => {
  if (bookingData.idempotencyKey) {
    const existing = await Booking.findOne({ idempotencyKey: bookingData.idempotencyKey });
    if (existing) {
      return existing;
    }
  }

  const customer = await Customer.findById(bookingData.customer);
  if (!customer) {
    throw ApiError.notFound(`Customer '${bookingData.customer}' does not exist`);
  }
  if (!customer.isActive) {
    throw ApiError.badRequest(`Customer '${customer.name}' is currently inactive`);
  }

  const bookingNumber = await generateBookingNumber();

  if (bookingData.confirm) {
    return await withInventoryTransaction(async (session) => {
      for (const it of bookingData.items) {
        await Product.findOneAndUpdate(
          { _id: it.product },
          { $inc: { __v: 1 } },
          { session, new: true }
        );

        const avail = await calculateProductAvailability(
          it.product,
          bookingData.startDate,
          bookingData.endDate,
          it.quantity,
          session
        );

        if (!avail.isAvailable) {
          throw ApiError.badRequest(
            `Insufficient stock for '${avail.name}'. Requested: ${avail.requestedQuantity}, Available: ${avail.availableQuantity}`
          );
        }
      }

      const pricing = await calculateBookingPricing(
        bookingData.items,
        bookingData.startDate,
        bookingData.endDate,
        bookingData.rentalType || "daily",
        bookingData.discount || 0,
        bookingData.refundableDeposit,
        bookingData.transportation,
        session
      );

      for (const it of pricing.items) {
        const prod = await Product.findById(it.product).session(session);
        if (prod) {
          prod.reservedQuantity = (prod.reservedQuantity || 0) + it.quantity;
          prod.recalculateAvailability();
          await prod.save({ session });
        }
      }

      const booking = await Booking.create(
        [
          {
            bookingNumber,
            customer: customer._id,
            items: pricing.items,
            startDate: new Date(bookingData.startDate),
            endDate: new Date(bookingData.endDate),
            rentalType: pricing.rentalType,
            duration: pricing.duration,
            subtotal: pricing.subtotal,
            discount: pricing.discount,
            tax: pricing.tax,
            refundableDeposit: pricing.refundableDeposit,
            transportation: {
              required: bookingData.transportation?.required || false,
              type: bookingData.transportation?.type || "none",
              fee: pricing.transportationFee,
              deliveryAddress: bookingData.transportation?.deliveryAddress || {},
            },
            totalAmount: pricing.totalAmount,
            status: "confirmed",
            notes: bookingData.notes || "",
            idempotencyKey: bookingData.idempotencyKey,
          },
        ],
        { session }
      );

      return booking[0];
    });
  }

  const pricing = await calculateBookingPricing(
    bookingData.items,
    bookingData.startDate,
    bookingData.endDate,
    bookingData.rentalType || "daily",
    bookingData.discount || 0,
    bookingData.refundableDeposit,
    bookingData.transportation
  );

  const booking = await Booking.create({
    bookingNumber,
    customer: customer._id,
    items: pricing.items,
    startDate: new Date(bookingData.startDate),
    endDate: new Date(bookingData.endDate),
    rentalType: pricing.rentalType,
    duration: pricing.duration,
    subtotal: pricing.subtotal,
    discount: pricing.discount,
    tax: pricing.tax,
    refundableDeposit: pricing.refundableDeposit,
    transportation: {
      required: bookingData.transportation?.required || false,
      type: bookingData.transportation?.type || "none",
      fee: pricing.transportationFee,
      deliveryAddress: bookingData.transportation?.deliveryAddress || {},
    },
    totalAmount: pricing.totalAmount,
    status: "draft",
    notes: bookingData.notes || "",
    idempotencyKey: bookingData.idempotencyKey,
  });

  return booking;
};

export const confirmBooking = async (id) => {
  return await withInventoryTransaction(async (session) => {
    const booking = await Booking.findById(id).session(session);
    if (!booking) {
      throw ApiError.notFound("Booking not found");
    }

    if (booking.status !== "draft") {
      throw ApiError.badRequest(
        `Cannot confirm booking with status '${booking.status}'. Only draft bookings can be confirmed.`
      );
    }

    for (const it of booking.items) {
      const product = await Product.findOneAndUpdate(
        { _id: it.product },
        { $inc: { __v: 1 } },
        { session, new: true }
      );

      if (!product) {
        throw ApiError.notFound(`Equipment product '${it.product}' was not found`);
      }

      const avail = await calculateProductAvailability(
        it.product,
        booking.startDate,
        booking.endDate,
        it.quantity,
        session
      );

      if (!avail.isAvailable) {
        throw ApiError.badRequest(
          `Insufficient stock for '${avail.name}'. Requested: ${avail.requestedQuantity}, Available: ${avail.availableQuantity}`
        );
      }

      product.reservedQuantity = (product.reservedQuantity || 0) + it.quantity;
      product.recalculateAvailability();
      await product.save({ session });
    }

    booking.status = "confirmed";
    await booking.save({ session });

    return booking;
  });
};

export const cancelBooking = async (id, cancellationReason = "") => {
  return await withInventoryTransaction(async (session) => {
    const booking = await Booking.findById(id).session(session);
    if (!booking) {
      throw ApiError.notFound("Booking not found");
    }

    if (booking.status === "cancelled") {
      throw ApiError.badRequest("Booking is already cancelled");
    }

    if (booking.status === "completed" || booking.status === "issued") {
      throw ApiError.badRequest(
        `Cannot cancel booking with status '${booking.status}'. Only draft or confirmed bookings can be cancelled.`
      );
    }

    if (booking.status === "confirmed") {
      for (const it of booking.items) {
        const product = await Product.findOneAndUpdate(
          { _id: it.product },
          { $inc: { __v: 1 } },
          { session, new: true }
        );

        if (product) {
          product.reservedQuantity = Math.max(0, (product.reservedQuantity || 0) - it.quantity);
          product.recalculateAvailability();
          await product.save({ session });
        }
      }
    }

    booking.status = "cancelled";
    booking.cancellationReason = cancellationReason || "";
    await booking.save({ session });

    return booking;
  });
};

export const getBookings = async (filters = {}) => {
  const {
    customer,
    status,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const query = {};

  if (customer) {
    query.customer = customer;
  }

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ bookingNumber: regex }, { notes: regex }];
  }

  const sort = {};
  const validSortFields = ["createdAt", "startDate", "endDate", "totalAmount", "status"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  sort[sortField] = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate("customer", "name phone email")
      .populate("items.product", "name sku dailyRate hourlyRate")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(query),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getBookingById = async (id) => {
  const booking = await Booking.findById(id)
    .populate("customer")
    .populate("items.product");

  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }

  return booking;
};

export const updateBooking = async (id, updateData) => {
  const currentBooking = await Booking.findById(id);
  if (!currentBooking) {
    throw ApiError.notFound("Booking not found");
  }

  if (["completed", "cancelled"].includes(currentBooking.status)) {
    throw ApiError.badRequest(`Cannot modify a booking in '${currentBooking.status}' status`);
  }

  if (currentBooking.status === "confirmed") {
    const datesChanged =
      (updateData.startDate && new Date(updateData.startDate).getTime() !== currentBooking.startDate.getTime()) ||
      (updateData.endDate && new Date(updateData.endDate).getTime() !== currentBooking.endDate.getTime());
    const itemsChanged = Boolean(updateData.items);

    if (datesChanged || itemsChanged) {
      return await withInventoryTransaction(async (session) => {
        const booking = await Booking.findById(id).session(session);

        for (const it of booking.items) {
          const prod = await Product.findOneAndUpdate(
            { _id: it.product },
            { $inc: { __v: 1 } },
            { session, new: true }
          );
          if (prod) {
            prod.reservedQuantity = Math.max(0, (prod.reservedQuantity || 0) - it.quantity);
            prod.recalculateAvailability();
            await prod.save({ session });
          }
        }

        const newStartDate = updateData.startDate ? new Date(updateData.startDate) : booking.startDate;
        const newEndDate = updateData.endDate ? new Date(updateData.endDate) : booking.endDate;
        const newItems = updateData.items || booking.items.map((i) => ({ product: i.product, quantity: i.quantity }));
        const newRentalType = updateData.rentalType || booking.rentalType;

        for (const it of newItems) {
          await Product.findOneAndUpdate(
            { _id: it.product },
            { $inc: { __v: 1 } },
            { session, new: true }
          );

          const avail = await calculateProductAvailability(
            it.product,
            newStartDate,
            newEndDate,
            it.quantity,
            session
          );

          if (!avail.isAvailable) {
            throw ApiError.badRequest(
              `Insufficient stock for '${avail.name}'. Requested: ${avail.requestedQuantity}, Available: ${avail.availableQuantity}`
            );
          }
        }

        const pricing = await calculateBookingPricing(
          newItems,
          newStartDate,
          newEndDate,
          newRentalType,
          updateData.discount !== undefined ? updateData.discount : booking.discount,
          updateData.refundableDeposit !== undefined ? updateData.refundableDeposit : booking.refundableDeposit,
          updateData.transportation !== undefined ? updateData.transportation : booking.transportation,
          session
        );

        for (const it of pricing.items) {
          const prod = await Product.findById(it.product).session(session);
          if (prod) {
            prod.reservedQuantity = (prod.reservedQuantity || 0) + it.quantity;
            prod.recalculateAvailability();
            await prod.save({ session });
          }
        }

        booking.startDate = newStartDate;
        booking.endDate = newEndDate;
        booking.items = pricing.items;
        booking.rentalType = pricing.rentalType;
        booking.duration = pricing.duration;
        booking.subtotal = pricing.subtotal;
        booking.discount = pricing.discount;
        booking.tax = pricing.tax;
        booking.refundableDeposit = pricing.refundableDeposit;
        if (updateData.transportation) {
          booking.transportation = {
            required: updateData.transportation.required ?? booking.transportation.required,
            type: updateData.transportation.type ?? booking.transportation.type,
            fee: pricing.transportationFee,
            deliveryAddress: updateData.transportation.deliveryAddress ?? booking.transportation.deliveryAddress,
          };
        }
        booking.totalAmount = pricing.totalAmount;
        if (updateData.notes !== undefined) booking.notes = updateData.notes;

        await booking.save({ session });
        return booking;
      });
    }
  }

  const newStartDate = updateData.startDate ? new Date(updateData.startDate) : currentBooking.startDate;
  const newEndDate = updateData.endDate ? new Date(updateData.endDate) : currentBooking.endDate;
  const newItems = updateData.items || currentBooking.items.map((i) => ({ product: i.product, quantity: i.quantity }));
  const newRentalType = updateData.rentalType || currentBooking.rentalType;

  const pricing = await calculateBookingPricing(
    newItems,
    newStartDate,
    newEndDate,
    newRentalType,
    updateData.discount !== undefined ? updateData.discount : currentBooking.discount,
    updateData.refundableDeposit !== undefined ? updateData.refundableDeposit : currentBooking.refundableDeposit,
    updateData.transportation !== undefined ? updateData.transportation : currentBooking.transportation
  );

  currentBooking.startDate = newStartDate;
  currentBooking.endDate = newEndDate;
  currentBooking.items = pricing.items;
  currentBooking.rentalType = pricing.rentalType;
  currentBooking.duration = pricing.duration;
  currentBooking.subtotal = pricing.subtotal;
  currentBooking.discount = pricing.discount;
  currentBooking.tax = pricing.tax;
  currentBooking.refundableDeposit = pricing.refundableDeposit;
  if (updateData.transportation) {
    currentBooking.transportation = {
      required: updateData.transportation.required ?? currentBooking.transportation.required,
      type: updateData.transportation.type ?? currentBooking.transportation.type,
      fee: pricing.transportationFee,
      deliveryAddress: updateData.transportation.deliveryAddress ?? currentBooking.transportation.deliveryAddress,
    };
  }
  currentBooking.totalAmount = pricing.totalAmount;
  if (updateData.notes !== undefined) currentBooking.notes = updateData.notes;

  await currentBooking.save();
  return currentBooking;
};
