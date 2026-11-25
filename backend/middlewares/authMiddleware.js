import ApiError from "../utils/ApiError.js";
import { verifyToken } from "../utils/jwt.js";
import Admin from "../models/Admin.js";

export const authenticate = async (req, _res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(ApiError.unauthorized("Authentication required. Please log in."));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return next(ApiError.unauthorized("Invalid or expired session. Please log in again."));
    }

    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return next(ApiError.unauthorized("Admin account no longer exists."));
    }

    if (!admin.isActive) {
      return next(ApiError.forbidden("Admin account has been deactivated."));
    }

    if (admin.role !== "admin") {
      return next(ApiError.forbidden("Access denied. Admin privileges required."));
    }

    req.admin = admin;
    req.adminId = admin._id;
    return next();
  } catch (err) {
    return next(err);
  }
};

export default authenticate;
