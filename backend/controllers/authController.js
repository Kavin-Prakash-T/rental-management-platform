import * as authService from "../services/authService.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getAuthCookieOptions, getCsrfCookieOptions } from "../utils/jwt.js";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.cookie("token", result.token, getAuthCookieOptions());
  res.cookie("csrfToken", result.csrfToken, getCsrfCookieOptions());

  return ApiResponse.success(
    res,
    {
      admin: result.admin,
      csrfToken: result.csrfToken,
    },
    "Login successful"
  );
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie("token", getAuthCookieOptions());
  res.clearCookie("csrfToken", getCsrfCookieOptions());

  return ApiResponse.success(res, null, "Logout successful");
});

export const getMe = asyncHandler(async (req, res) => {
  const admin = await authService.getMe(req.adminId);
  return ApiResponse.success(res, { admin }, "Profile retrieved successfully");
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.adminId, currentPassword, newPassword);

  res.clearCookie("token", getAuthCookieOptions());
  res.clearCookie("csrfToken", getCsrfCookieOptions());

  return ApiResponse.success(
    res,
    null,
    "Password changed successfully. Please log in again with your new password."
  );
});
