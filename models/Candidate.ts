import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// IMPORTANT: rows in this collection are only ever created by the Excel-import
// service (services/excelService.ts), which only ORG_ADMIN / SUPER_ADMIN routes call.
// GENERATOR_ADMIN must only reach this collection through
// services/candidateService.ts#uploadCandidatePhoto and #generateCertificate,
// which allowlist the exact fields a generator may write. See lib/permissions.ts.
const candidateSchema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: "ExcelAssignment", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },

    certificateNo: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, default: "" },
    course: { type: String, required: true },
    duration: { type: String, default: "" },
    grade: { type: String, default: "" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    issueDate: { type: Date, default: null },
    remarks: { type: String, default: "" },

    // Non-guessable verification token used in the QR code / verify URL.
    // Never the sequential certificateNo.
    verificationId: { type: String, required: true, unique: true },

    // --- Fields a GENERATOR_ADMIN is allowed to write ---
    photoUrl: { type: String, default: null },
    photoUploadedAt: { type: Date, default: null },
    photoUploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    generated: { type: Boolean, default: false },
    generatedAt: { type: Date, default: null },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    pdfUrl: { type: String, default: null },
    pdfVersion: { type: Number, default: 0 },
    // --- end generator-writable fields ---

    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },
  },
  { timestamps: true }
);

candidateSchema.index({ organizationId: 1, certificateNo: 1 }, { unique: true });
candidateSchema.index({ assignmentId: 1 });

// Fields a GENERATOR_ADMIN may write. Kept next to the schema so the allowlist
// can't silently drift from the model as new fields are added.
export const GENERATOR_WRITABLE_FIELDS = [
  "photoUrl",
  "photoUploadedAt",
  "photoUploadedBy",
  "generated",
  "generatedAt",
  "generatedBy",
  "pdfUrl",
  "pdfVersion",
] as const;

export type CandidateDoc = InferSchemaType<typeof candidateSchema>;

export const Candidate: Model<CandidateDoc> =
  models.Candidate || model<CandidateDoc>("Candidate", candidateSchema);
