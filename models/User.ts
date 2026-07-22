import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ROLES, USER_STATUS } from "@/lib/constants";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    // null for SUPER_ADMIN. Required for ORG_ADMIN and GENERATOR_ADMIN.
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null },
    status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

userSchema.index({ organizationId: 1, role: 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> = models.User || model<UserDoc>("User", userSchema);
