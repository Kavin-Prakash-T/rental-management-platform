import express from "express";
import { cronAuthMiddleware } from "../middlewares/cronAuthMiddleware.js";
import { handleRentalReminders } from "../controllers/cronController.js";

const router = express.Router();

router.use(cronAuthMiddleware);

router.get("/rental-reminders", handleRentalReminders);

export default router;
