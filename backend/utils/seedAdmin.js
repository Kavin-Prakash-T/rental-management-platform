import "dotenv/config";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Admin from "../models/Admin.js";

const ask = async (promptText) => {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(promptText);
  rl.close();
  return answer.trim();
};

const seedAdmin = async () => {
  try {
    await connectDB();

    let name = process.env.ADMIN_NAME;
    let email = process.env.ADMIN_EMAIL;
    let password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      if (process.stdin.isTTY) {
        if (!name) name = await ask("Enter Admin Name: ");
        if (!email) email = await ask("Enter Admin Email: ");
        if (!password) password = await ask("Enter Admin Password: ");
      }
    }

    if (!name || !email || !password) {
      console.error("❌ Admin credentials not provided via environment variables (ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD) or terminal input.");
      await mongoose.disconnect();
      process.exit(1);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingAdmin = await Admin.findOne({ email: normalizedEmail });

    if (existingAdmin) {
      console.log(`ℹ️ Admin with email '${normalizedEmail}' already exists. No changes made.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    await Admin.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "admin",
      isActive: true,
    });

    console.log(`✅ Admin user seeded successfully with email: ${normalizedEmail}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding failed: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
