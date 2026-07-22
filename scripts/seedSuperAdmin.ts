import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { ROLES, USER_STATUS } from "../lib/constants";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  const name = process.env.SEED_SUPER_ADMIN_NAME ?? "Super Admin";
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD must be set");
  }

  await mongoose.connect(uri);

  const existing = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existing) {
    console.log(`A Super Admin already exists (${existing.email}). Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await User.create({
    name,
    email: email.toLowerCase(),
    password: passwordHash,
    role: ROLES.SUPER_ADMIN,
    organizationId: null,
    status: USER_STATUS.ACTIVE,
  });

  console.log(`Created Super Admin ${admin.email}. Change the seeded password after first login.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
