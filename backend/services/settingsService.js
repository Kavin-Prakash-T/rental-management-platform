import Settings from "../models/Settings.js";
import ApiError from "../utils/ApiError.js";

export const getSettings = async () => {
  return Settings.getSettings();
};

export const getPublicSettings = async () => {
  const settings = await Settings.getSettings();
  return settings.toPublicJSON();
};

export const updateSettings = async (updateData) => {
  const settings = await Settings.getSettings();

  const allowedTopLevelFields = [
    "businessName",
    "address",
    "phone",
    "email",
    "openingHours",
    "upiId",
    "upiDisplayName",
    "invoicePrefix",
    "depositConfig",
    "transportationFee",
    "taxConfig",
    "currency",
    "rentalPolicies",
    "returnReminderPreferences",
  ];

  for (const key of Object.keys(updateData)) {
    if (!allowedTopLevelFields.includes(key)) {
      throw ApiError.badRequest(`Field '${key}' is not allowed to be updated`);
    }

    if (
      typeof updateData[key] === "object" &&
      updateData[key] !== null &&
      !Array.isArray(updateData[key]) &&
      typeof settings[key] === "object"
    ) {
      settings[key] = {
        ...(settings[key]?.toObject ? settings[key].toObject() : settings[key]),
        ...updateData[key],
      };
    } else {
      settings[key] = updateData[key];
    }
  }

  await settings.save();
  return settings;
};
