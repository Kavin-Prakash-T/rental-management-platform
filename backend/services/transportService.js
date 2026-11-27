import Transport from "../models/Transport.js";
import Booking from "../models/Booking.js";
import ApiError from "../utils/ApiError.js";

const normalizePhone = (phone) => {
  if (!phone) return "";
  return phone.replace(/[\s\-()]/g, "");
};

export const createTransport = async (data) => {
  const booking = await Booking.findById(data.booking);
  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }

  const serviceType = data.serviceType || "delivery";
  const existingActive = await Transport.findOne({
    booking: booking._id,
    serviceType,
    status: { $ne: "cancelled" },
  });

  if (existingActive) {
    throw ApiError.conflict(
      `Active transportation for '${serviceType}' already exists for booking ${booking.bookingNumber}`
    );
  }

  const contactNumber = normalizePhone(data.contactNumber);

  const deliveryAddress = data.deliveryAddress || {
    street: booking.transportation?.deliveryAddress?.street || "",
    city: booking.transportation?.deliveryAddress?.city || "",
    state: booking.transportation?.deliveryAddress?.state || "",
    pincode: booking.transportation?.deliveryAddress?.pincode || "",
  };

  const transport = await Transport.create({
    booking: booking._id,
    serviceType,
    providerName: data.providerName.trim(),
    contactNumber,
    vehicleNumber: data.vehicleNumber ? data.vehicleNumber.trim().toUpperCase() : "",
    pickupAddress: data.pickupAddress || {},
    deliveryAddress,
    scheduledDate: new Date(data.scheduledDate),
    transportationCost: data.transportationCost || 0,
    arrangementFee: data.arrangementFee || 0,
    paymentResponsibility: data.paymentResponsibility || "shop_collected",
    paymentStatus: data.paymentStatus || "pending",
    status: data.status || "scheduled",
    notes: data.notes ? data.notes.trim() : "",
  });

  booking.transportation = {
    required: true,
    type: serviceType,
    fee:
      data.paymentResponsibility === "shop_collected"
        ? (data.transportationCost || 0) + (data.arrangementFee || 0)
        : data.arrangementFee || 0,
    deliveryAddress,
  };
  await booking.save();

  return transport;
};

export const getTransports = async (filters = {}) => {
  const {
    booking,
    status,
    paymentResponsibility,
    paymentStatus,
    search,
    page = 1,
    limit = 10,
    sortBy = "scheduledDate",
    sortOrder = "asc",
  } = filters;

  const query = {};

  if (booking) {
    query.booking = booking;
  }

  if (status) {
    query.status = status;
  }

  if (paymentResponsibility) {
    query.paymentResponsibility = paymentResponsibility;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ providerName: regex }, { vehicleNumber: regex }, { contactNumber: regex }];
  }

  const sort = {};
  const validSortFields = [
    "scheduledDate",
    "createdAt",
    "transportationCost",
    "arrangementFee",
    "status",
  ];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "scheduledDate";
  sort[sortField] = sortOrder === "desc" ? -1 : 1;

  const skip = (page - 1) * limit;

  const [transports, total] = await Promise.all([
    Transport.find(query)
      .populate("booking", "bookingNumber customer startDate endDate status totalAmount")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Transport.countDocuments(query),
  ]);

  return {
    transports,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getTransportById = async (id) => {
  const transport = await Transport.findById(id).populate({
    path: "booking",
    populate: { path: "customer", select: "name phone email" },
  });

  if (!transport) {
    throw ApiError.notFound("Transportation record not found");
  }

  return transport;
};

export const updateTransport = async (id, updateData) => {
  const transport = await Transport.findById(id);
  if (!transport) {
    throw ApiError.notFound("Transportation record not found");
  }

  if (transport.status === "cancelled") {
    throw ApiError.badRequest("Cannot modify a cancelled transportation record");
  }

  if (updateData.serviceType) transport.serviceType = updateData.serviceType;
  if (updateData.providerName) transport.providerName = updateData.providerName.trim();
  if (updateData.contactNumber) transport.contactNumber = normalizePhone(updateData.contactNumber);
  if (updateData.vehicleNumber !== undefined) {
    transport.vehicleNumber = updateData.vehicleNumber.trim().toUpperCase();
  }
  if (updateData.pickupAddress) transport.pickupAddress = updateData.pickupAddress;
  if (updateData.deliveryAddress) transport.deliveryAddress = updateData.deliveryAddress;
  if (updateData.scheduledDate) transport.scheduledDate = new Date(updateData.scheduledDate);
  if (updateData.transportationCost !== undefined) {
    transport.transportationCost = updateData.transportationCost;
  }
  if (updateData.arrangementFee !== undefined) {
    transport.arrangementFee = updateData.arrangementFee;
  }
  if (updateData.paymentResponsibility) {
    transport.paymentResponsibility = updateData.paymentResponsibility;
  }
  if (updateData.paymentStatus) transport.paymentStatus = updateData.paymentStatus;
  if (updateData.status) transport.status = updateData.status;
  if (updateData.notes !== undefined) transport.notes = updateData.notes.trim();

  await transport.save();
  return transport;
};

export const cancelTransport = async (id, cancellationNotes = "") => {
  const transport = await Transport.findById(id);
  if (!transport) {
    throw ApiError.notFound("Transportation record not found");
  }

  if (transport.status === "cancelled") {
    throw ApiError.badRequest("Transportation is already cancelled");
  }

  if (transport.status === "completed") {
    throw ApiError.badRequest("Cannot cancel completed transportation");
  }

  transport.status = "cancelled";
  transport.paymentStatus = "cancelled";
  if (cancellationNotes) {
    transport.notes = transport.notes
      ? `${transport.notes}; ${cancellationNotes.trim()}`
      : cancellationNotes.trim();
  }

  await transport.save();
  return transport;
};

export const updateTransportStatus = async (id, statusData = {}) => {
  const transport = await Transport.findById(id);
  if (!transport) {
    throw ApiError.notFound("Transportation record not found");
  }

  if (transport.status === "cancelled") {
    throw ApiError.badRequest("Cannot update status of cancelled transportation");
  }

  if (statusData.status) {
    transport.status = statusData.status;
  }

  if (statusData.paymentStatus) {
    transport.paymentStatus = statusData.paymentStatus;
  }

  if (statusData.notes) {
    transport.notes = transport.notes
      ? `${transport.notes}; ${statusData.notes.trim()}`
      : statusData.notes.trim();
  }

  await transport.save();
  return transport;
};
