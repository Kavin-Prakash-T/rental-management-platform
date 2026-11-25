import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
      default: "RentSphere Event Rentals",
    },
    address: {
      street: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      pincode: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "India" },
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    openingHours: {
      type: String,
      trim: true,
      default: "Mon-Sat: 9:00 AM - 8:00 PM, Sun: 10:00 AM - 4:00 PM",
    },
    upiId: {
      type: String,
      trim: true,
      default: "",
    },
    upiDisplayName: {
      type: String,
      trim: true,
      default: "RentSphere",
    },
    invoicePrefix: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INV",
    },
    depositConfig: {
      type: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },
      value: {
        type: Number,
        default: 20,
        min: 0,
      },
    },
    transportationFee: {
      baseFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      perKmFee: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    taxConfig: {
      enabled: {
        type: Boolean,
        default: true,
      },
      gstin: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },
      cgstRate: {
        type: Number,
        default: 9,
        min: 0,
        max: 100,
      },
      sgstRate: {
        type: Number,
        default: 9,
        min: 0,
        max: 100,
      },
      igstRate: {
        type: Number,
        default: 18,
        min: 0,
        max: 100,
      },
    },
    currency: {
      type: String,
      trim: true,
      default: "INR",
    },
    rentalPolicies: {
      termsAndConditions: {
        type: String,
        default: "Equipment must be returned in good working condition.",
      },
      cancellationPolicy: {
        type: String,
        default: "Cancellations made 48 hours prior to the event are eligible for a full refund of deposit.",
      },
      damagePolicy: {
        type: String,
        default: "Any damage or loss to the equipment will be deducted from the security deposit.",
      },
    },
    returnReminderPreferences: {
      enabled: {
        type: Boolean,
        default: true,
      },
      remindDaysBefore: {
        type: Number,
        default: 1,
        min: 0,
      },
      reminderHourIST: {
        type: Number,
        default: 9,
        min: 0,
        max: 23,
      },
    },
  },
  {
    timestamps: true,
  }
);

settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

settingsSchema.methods.toPublicJSON = function () {
  return {
    businessName: this.businessName,
    address: this.address,
    phone: this.phone,
    email: this.email,
    openingHours: this.openingHours,
    upiDisplayName: this.upiDisplayName,
    currency: this.currency,
    rentalPolicies: this.rentalPolicies,
    taxConfig: {
      enabled: this.taxConfig.enabled,
      gstin: this.taxConfig.gstin,
    },
  };
};

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
