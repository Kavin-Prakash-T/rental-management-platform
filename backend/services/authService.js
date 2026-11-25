import Admin from "../models/Admin.js";
import ApiError from "../utils/ApiError.js";
import { signToken, generateCsrfToken } from "../utils/jwt.js";

export const login = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();
  const admin = await Admin.findOne({ email: normalizedEmail }).select("+password");

  if (!admin) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (!admin.isActive) {
    throw ApiError.forbidden("Admin account has been deactivated. Please contact support.");
  }

  const isPasswordValid = await admin.comparePassword(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  const token = signToken({ id: admin._id, role: admin.role });
  const csrfToken = generateCsrfToken();

  return {
    admin: admin.toJSON(),
    token,
    csrfToken,
  };
};

export const getMe = async (adminId) => {
  const admin = await Admin.findById(adminId);

  if (!admin) {
    throw ApiError.notFound("Admin account not found");
  }

  if (!admin.isActive) {
    throw ApiError.forbidden("Admin account has been deactivated");
  }

  return admin.toJSON();
};

export const changePassword = async (adminId, currentPassword, newPassword) => {
  const admin = await Admin.findById(adminId).select("+password");

  if (!admin) {
    throw ApiError.notFound("Admin account not found");
  }

  const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  if (currentPassword === newPassword) {
    throw ApiError.badRequest("New password cannot be the same as current password");
  }

  admin.password = newPassword;
  await admin.save();

  return { success: true };
};
