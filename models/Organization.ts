import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ORG_STATUS } from "@/lib/constants";

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String, default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    address: { type: String, default: "" },
    website: { type: String, default: "" },
    certificatePrefix: { type: String, required: true, trim: true, uppercase: true },
    qrDomain: { type: String, required: true },
    signature: { type: String, default: null },
    status: { type: String, enum: Object.values(ORG_STATUS), default: ORG_STATUS.ACTIVE },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export type OrganizationDoc = InferSchemaType<typeof organizationSchema>;

export const Organization: Model<OrganizationDoc> =
  models.Organization || model<OrganizationDoc>("Organization", organizationSchema);
