import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";

import connectDB from "./config/db.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorMiddleware.js";
import { apiLimiter } from "./middlewares/rateLimitMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import transportRoutes from "./routes/transportRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import faqRoutes from "./routes/faqRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import adminAiRoutes from "./routes/adminAiRoutes.js";

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  }[dbState] ?? "unknown";

  const status = dbState === 1 ? 200 : 503;

  res.status(status).json({
    success: dbState === 1,
    message: dbState === 1 ? "RentSphere API is running" : "Database unavailable",
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/transport", transportRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin/ai", adminAiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀  RentSphere API listening on port ${PORT}`);
  });
};

if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  start().catch((err) => {
    console.error("💥  Failed to start server:", err.message);
    process.exit(1);
  });
}

export default app;
