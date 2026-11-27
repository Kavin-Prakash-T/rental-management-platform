import Product from "../models/Product.js";
import Maintenance from "../models/Maintenance.js";
import ApiError from "../utils/ApiError.js";
import {
  calculateProductAvailability,
  withInventoryTransaction,
} from "./availabilityService.js";

export const createMaintenance = async (data) => {
  const product = await Product.findById(data.product);
  if (!product) {
    throw ApiError.notFound(`Product '${data.product}' was not found`);
  }

  const requestedQty = data.quantity || 1;
  if (requestedQty > product.totalQuantity) {
    throw ApiError.badRequest(
      `Maintenance quantity (${requestedQty}) cannot exceed total product stock (${product.totalQuantity})`
    );
  }

  const reqStart = new Date(data.startDate);
  const reqEnd = new Date(data.endDate);

  const avail = await calculateProductAvailability(
    product._id,
    reqStart,
    reqEnd,
    requestedQty
  );

  if (!avail.isAvailable && !data.forceConflictResolution) {
    throw ApiError.conflict(
      `Maintenance schedule conflicts with confirmed rentals for '${product.name}'. Available: ${avail.availableQuantity}, Requested: ${requestedQty}. Pass forceConflictResolution: true to override.`
    );
  }

  return await withInventoryTransaction(async (session) => {
    if (data.status === "in_progress") {
      const prod = await Product.findOneAndUpdate(
        { _id: product._id },
        { $inc: { __v: 1 } },
        { session, new: true }
      );

      if (prod.availableQuantity < requestedQty) {
        throw ApiError.badRequest(
          `Insufficient available stock to start maintenance. Available: ${prod.availableQuantity}, Requested: ${requestedQty}`
        );
      }

      prod.maintenanceQuantity = (prod.maintenanceQuantity || 0) + requestedQty;
      prod.recalculateAvailability();
      await prod.save({ session });
    }

    const maintenance = await Maintenance.create(
      [
        {
          product: product._id,
          quantity: requestedQty,
          maintenanceType: data.maintenanceType || "scheduled",
          issueDescription: data.issueDescription || data.reason || "",
          reason: data.reason || data.issueDescription || "",
          startDate: reqStart,
          endDate: reqEnd,
          status: data.status || "scheduled",
          cost: data.cost || 0,
          performedBy: data.performedBy || "",
          notes: data.notes || "",
        },
      ],
      { session }
    );

    return maintenance[0];
  });
};

export const startMaintenance = async (id) => {
  return await withInventoryTransaction(async (session) => {
    const maintenance = await Maintenance.findById(id).session(session);
    if (!maintenance) {
      throw ApiError.notFound("Maintenance record not found");
    }

    if (maintenance.status !== "scheduled") {
      throw ApiError.badRequest(
        `Cannot start maintenance in '${maintenance.status}' status. Only scheduled maintenance can be started.`
      );
    }

    const product = await Product.findOneAndUpdate(
      { _id: maintenance.product },
      { $inc: { __v: 1 } },
      { session, new: true }
    );

    if (!product) {
      throw ApiError.notFound("Associated product not found");
    }

    if (product.availableQuantity < maintenance.quantity) {
      throw ApiError.badRequest(
        `Insufficient available stock to start maintenance. Available: ${product.availableQuantity}, Required: ${maintenance.quantity}`
      );
    }

    product.maintenanceQuantity = (product.maintenanceQuantity || 0) + maintenance.quantity;
    product.recalculateAvailability();
    await product.save({ session });

    maintenance.status = "in_progress";
    await maintenance.save({ session });

    return maintenance;
  });
};

export const completeMaintenance = async (id, completionData = {}) => {
  return await withInventoryTransaction(async (session) => {
    const maintenance = await Maintenance.findById(id).session(session);
    if (!maintenance) {
      throw ApiError.notFound("Maintenance record not found");
    }

    if (maintenance.status === "completed") {
      throw ApiError.badRequest("Maintenance is already completed");
    }

    if (maintenance.status === "cancelled") {
      throw ApiError.badRequest("Cannot complete a cancelled maintenance record");
    }

    if (maintenance.status === "in_progress") {
      const product = await Product.findOneAndUpdate(
        { _id: maintenance.product },
        { $inc: { __v: 1 } },
        { session, new: true }
      );

      if (product) {
        product.maintenanceQuantity = Math.max(
          0,
          (product.maintenanceQuantity || 0) - maintenance.quantity
        );
        product.recalculateAvailability();
        await product.save({ session });
      }
    }

    const completionDate = completionData.actualCompletionDate
      ? new Date(completionData.actualCompletionDate)
      : new Date();

    maintenance.status = "completed";
    maintenance.actualCompletionDate = completionDate;
    maintenance.actualReturnDate = completionDate;
    if (completionData.cost !== undefined) {
      maintenance.cost = completionData.cost;
    }
    if (completionData.performedBy) {
      maintenance.performedBy = completionData.performedBy;
    }
    if (completionData.notes) {
      maintenance.notes = maintenance.notes
        ? `${maintenance.notes}; ${completionData.notes}`
        : completionData.notes;
    }

    await maintenance.save({ session });
    return maintenance;
  });
};

export const cancelMaintenance = async (id) => {
  return await withInventoryTransaction(async (session) => {
    const maintenance = await Maintenance.findById(id).session(session);
    if (!maintenance) {
      throw ApiError.notFound("Maintenance record not found");
    }

    if (maintenance.status === "cancelled") {
      throw ApiError.badRequest("Maintenance is already cancelled");
    }

    if (maintenance.status === "completed") {
      throw ApiError.badRequest("Cannot cancel a completed maintenance record");
    }

    if (maintenance.status === "in_progress") {
      const product = await Product.findOneAndUpdate(
        { _id: maintenance.product },
        { $inc: { __v: 1 } },
        { session, new: true }
      );

      if (product) {
        product.maintenanceQuantity = Math.max(
          0,
          (product.maintenanceQuantity || 0) - maintenance.quantity
        );
        product.recalculateAvailability();
        await product.save({ session });
      }
    }

    maintenance.status = "cancelled";
    await maintenance.save({ session });

    return maintenance;
  });
};

export const updateMaintenance = async (id, updateData) => {
  const maintenance = await Maintenance.findById(id);
  if (!maintenance) {
    throw ApiError.notFound("Maintenance record not found");
  }

  if (["completed", "cancelled"].includes(maintenance.status)) {
    throw ApiError.badRequest(`Cannot modify a maintenance record in '${maintenance.status}' status`);
  }

  if (updateData.quantity !== undefined) {
    maintenance.quantity = updateData.quantity;
  }
  if (updateData.maintenanceType) {
    maintenance.maintenanceType = updateData.maintenanceType;
  }
  if (updateData.issueDescription !== undefined) {
    maintenance.issueDescription = updateData.issueDescription;
  }
  if (updateData.reason !== undefined) {
    maintenance.reason = updateData.reason;
  }
  if (updateData.startDate) {
    maintenance.startDate = new Date(updateData.startDate);
  }
  if (updateData.endDate) {
    maintenance.endDate = new Date(updateData.endDate);
  }
  if (updateData.cost !== undefined) {
    maintenance.cost = updateData.cost;
  }
  if (updateData.performedBy !== undefined) {
    maintenance.performedBy = updateData.performedBy;
  }
  if (updateData.notes !== undefined) {
    maintenance.notes = updateData.notes;
  }

  await maintenance.save();
  return maintenance;
};

export const getMaintenanceList = async (filters = {}) => {
  const {
    product,
    status,
    maintenanceType,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const query = {};

  if (product) {
    query.product = product;
  }

  if (status) {
    query.status = status;
  }

  if (maintenanceType) {
    query.maintenanceType = maintenanceType;
  }

  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ issueDescription: regex }, { reason: regex }, { notes: regex }];
  }

  const sort = {};
  const validSortFields = ["createdAt", "startDate", "endDate", "cost", "status"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  sort[sortField] = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    Maintenance.find(query)
      .populate("product", "name sku condition dailyRate availableQuantity")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Maintenance.countDocuments(query),
  ]);

  return {
    maintenance: records,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getMaintenanceById = async (id) => {
  const record = await Maintenance.findById(id).populate("product");
  if (!record) {
    throw ApiError.notFound("Maintenance record not found");
  }
  return record;
};
