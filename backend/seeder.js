import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./models/adminSchema.js";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

// Fix: Drop the problematic username index if it exists


const DEFAULT_PASSWORD = process.env.ADMIN_SEED_PASSWORD || null;

let passwordToUse = DEFAULT_PASSWORD;

if (!passwordToUse) {
  passwordToUse = "AdminPass123";
  console.log("No ADMIN_SEED_PASSWORD provided. Generated secure password for seeder.");
}

const existingAdmin = await Admin.findOne({ email: "skillconnect@gmail.com" });
if (existingAdmin) {
  console.log("Admin already exists, skipping admin creation.");
} else {
  const admin = await Admin.create({
    name: "Admin",
    profilePic: "",
    email: "skillconnect@gmail.com",
    password: passwordToUse,
    role: "Admin"
  });
  console.log("Admin created successfully.");
}

