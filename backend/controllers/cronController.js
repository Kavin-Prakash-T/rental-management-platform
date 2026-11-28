import { processAutomatedRentalReminders } from "../services/reminderService.js";
import ApiResponse from "../utils/ApiResponse.js";

export const handleRentalReminders = async (req, res, next) => {
  try {
    const { batchSize } = req.query;
    const result = await processAutomatedRentalReminders({ batchSize });
    return ApiResponse.success(res, result, "Automated rental reminders processed");
  } catch (err) {
    next(err);
  }
};
