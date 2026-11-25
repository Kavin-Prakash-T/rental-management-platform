import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";

import connectDB from "./config/db.js";
const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

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
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀  RentSphere API listening on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error("💥  Failed to start server:", err.message);
  process.exit(1);
});

export default app;
