import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";

import connectDB from "./config/db.js";

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "RentSphere API is running",
    environment: process.env.NODE_ENV || "development",
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
