import Customer from "../models/Customer.js";
import ApiError from "../utils/ApiError.js";

export const normalizePhone = (phone) => {
  if (!phone) return "";
  return phone.replace(/[\s\-()]/g, "");
};

export const normalizeEmail = (email) => {
  if (!email || !email.trim()) return undefined;
  return email.trim().toLowerCase();
};

export const createCustomer = async (customerData) => {
  const normalizedPhone = normalizePhone(customerData.phone);
  const normalizedEmail = normalizeEmail(customerData.email);

  const existingPhone = await Customer.findOne({ phone: normalizedPhone });
  if (existingPhone) {
    throw ApiError.conflict(`Customer with phone number '${normalizedPhone}' already exists`);
  }

  if (normalizedEmail) {
    const existingEmail = await Customer.findOne({ email: normalizedEmail });
    if (existingEmail) {
      throw ApiError.conflict(`Customer with email '${normalizedEmail}' already exists`);
    }
  }

  const customer = await Customer.create({
    name: customerData.name.trim(),
    phone: normalizedPhone,
    email: normalizedEmail,
    address: {
      street: customerData.address?.street?.trim() || "",
      city: customerData.address?.city?.trim() || "",
      state: customerData.address?.state?.trim() || "",
      pincode: customerData.address?.pincode?.trim() || "",
    },
    notes: customerData.notes?.trim() || "",
    isActive: customerData.isActive !== undefined ? customerData.isActive : true,
  });

  return customer;
};

export const getCustomers = async (filters = {}) => {
  const {
    search,
    isActive,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const query = {};

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escaped, "i");
    query.$or = [
      { name: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
    ];
  }

  const sort = {};
  const validSortFields = ["name", "phone", "email", "createdAt", "updatedAt"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  sort[sortField] = sortOrder === "asc" ? 1 : -1;

  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    Customer.find(query).sort(sort).skip(skip).limit(limit),
    Customer.countDocuments(query),
  ]);

  return {
    customers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getCustomerById = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw ApiError.notFound("Customer not found");
  }
  return customer;
};

export const updateCustomer = async (id, updateData) => {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw ApiError.notFound("Customer not found");
  }

  if (updateData.phone !== undefined) {
    const normalizedPhone = normalizePhone(updateData.phone);
    if (normalizedPhone !== customer.phone) {
      const existingPhone = await Customer.findOne({
        phone: normalizedPhone,
        _id: { $ne: id },
      });
      if (existingPhone) {
        throw ApiError.conflict(`Customer with phone number '${normalizedPhone}' already exists`);
      }
      customer.phone = normalizedPhone;
    }
  }

  if (updateData.email !== undefined) {
    const normalizedEmail = normalizeEmail(updateData.email);
    if (normalizedEmail !== customer.email) {
      if (normalizedEmail) {
        const existingEmail = await Customer.findOne({
          email: normalizedEmail,
          _id: { $ne: id },
        });
        if (existingEmail) {
          throw ApiError.conflict(`Customer with email '${normalizedEmail}' already exists`);
        }
      }
      customer.email = normalizedEmail;
    }
  }

  if (updateData.name !== undefined) {
    customer.name = updateData.name.trim();
  }

  if (updateData.address !== undefined) {
    customer.address = {
      street: updateData.address.street !== undefined ? updateData.address.street.trim() : customer.address.street,
      city: updateData.address.city !== undefined ? updateData.address.city.trim() : customer.address.city,
      state: updateData.address.state !== undefined ? updateData.address.state.trim() : customer.address.state,
      pincode: updateData.address.pincode !== undefined ? updateData.address.pincode.trim() : customer.address.pincode,
    };
  }

  if (updateData.notes !== undefined) {
    customer.notes = updateData.notes.trim();
  }

  if (updateData.isActive !== undefined) {
    customer.isActive = updateData.isActive;
  }

  await customer.save();
  return customer;
};

export const deleteCustomer = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw ApiError.notFound("Customer not found");
  }

  customer.isActive = false;
  await customer.save();
  return customer;
};
