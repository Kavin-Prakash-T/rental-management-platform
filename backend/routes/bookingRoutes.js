import { Router } from "express";
import * as bookingController from "../controllers/bookingController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import csrfProtection from "../middlewares/csrfMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  createBookingSchema,
  updateBookingSchema,
  bookingIdParamSchema,
  cancelBookingSchema,
  issueBookingSchema,
  returnBookingSchema,
  bookingCalendarQuerySchema,
  getBookingsQuerySchema,
} from "../validators/bookingValidator.js";

const router = Router();

router.post(
  "/",
  authenticate,
  csrfProtection,
  validate({ body: createBookingSchema }),
  bookingController.createBooking
);

router.get(
  "/",
  authenticate,
  validate({ query: getBookingsQuerySchema }),
  bookingController.getBookings
);

router.get(
  "/calendar",
  authenticate,
  validate({ query: bookingCalendarQuerySchema }),
  bookingController.getBookingCalendar
);

router.get(
  "/:id",
  authenticate,
  validate({ params: bookingIdParamSchema }),
  bookingController.getBookingById
);

router.patch(
  "/:id",
  authenticate,
  csrfProtection,
  validate({ params: bookingIdParamSchema, body: updateBookingSchema }),
  bookingController.updateBooking
);

router.post(
  "/:id/confirm",
  authenticate,
  csrfProtection,
  validate({ params: bookingIdParamSchema }),
  bookingController.confirmBooking
);

router.post(
  "/:id/cancel",
  authenticate,
  csrfProtection,
  validate({ params: bookingIdParamSchema, body: cancelBookingSchema }),
  bookingController.cancelBooking
);

router.post(
  "/:id/issue",
  authenticate,
  csrfProtection,
  validate({ params: bookingIdParamSchema, body: issueBookingSchema }),
  bookingController.issueBooking
);

router.post(
  "/:id/return",
  authenticate,
  csrfProtection,
  validate({ params: bookingIdParamSchema, body: returnBookingSchema }),
  bookingController.returnBooking
);

export default router;
