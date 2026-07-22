import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Append-only version history. Regenerating a certificate (typo fix, wrong photo,
// revocation) must never overwrite a row here -- it inserts a new version instead,
// per the regeneration policy (Candidate.pdfVersion tracks the current pointer).
const generatedCertificateSchema = new Schema(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    version: { type: Number, required: true },
    pdfUrl: { type: String, required: true },
    hash: { type: String, required: true }, // SHA-256 of the generated PDF, tamper detection
    verificationId: { type: String, required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    revoked: { type: Boolean, default: false },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true }
);

generatedCertificateSchema.index({ candidateId: 1, version: -1 });

export type GeneratedCertificateDoc = InferSchemaType<typeof generatedCertificateSchema>;

export const GeneratedCertificate: Model<GeneratedCertificateDoc> =
  models.GeneratedCertificate ||
  model<GeneratedCertificateDoc>("GeneratedCertificate", generatedCertificateSchema);
