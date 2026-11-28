import { Router } from "express";
import authenticate from "../middlewares/authMiddleware.js";
import {
  getNotificationLogs,
  getNotificationById,
  retryNotification,
  sendReturnReminder,
} from "../controllers/notificationController.js";

const router = Router();

router.use(authenticate);

router.get("/", getNotificationLogs);
router.get("/:id", getNotificationById);
router.post("/:id/retry", retryNotification);
router.post("/remind/:bookingId", sendReturnReminder);

export default router;
