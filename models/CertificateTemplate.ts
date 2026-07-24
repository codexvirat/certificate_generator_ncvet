import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const positionSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    size: { type: Number },
  },
  { _id: false }
);

const textFieldSchema = new Schema(
  {
    key: { type: String, required: true }, // e.g. NAME, COURSE, GRADE, DATE
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    fontSize: { type: Number, default: 16 },
    fontColor: { type: String, default: "#000000" },
    fontFamily: { type: String, default: "Helvetica" },
    align: { type: String, enum: ["left", "center", "right"], default: "center" },
  },
  { _id: false }
);

const certificateTemplateSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true, trim: true },
    background: { type: String, required: true }, // uploaded template image/PDF url
    signature: { type: String, default: null }, // uploaded signature image url, drawn at signaturePosition
    qrPosition: { type: positionSchema, default: null }, // omit to skip drawing a QR entirely
    photoPosition: { type: positionSchema, required: true },
    signaturePosition: { type: positionSchema, default: null },
    textFields: { type: [textFieldSchema], default: [] },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

certificateTemplateSchema.index({ organizationId: 1, isActive: 1 });

export type CertificateTemplateDoc = InferSchemaType<typeof certificateTemplateSchema>;

export const CertificateTemplate: Model<CertificateTemplateDoc> =
  models.CertificateTemplate ||
  model<CertificateTemplateDoc>("CertificateTemplate", certificateTemplateSchema);
