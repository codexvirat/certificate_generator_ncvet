import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { BATCH_STATUS } from "@/lib/constants";

// One document per uploaded Excel = one batch. Only ORG_ADMIN (or SUPER_ADMIN) may
// create/edit these or the Candidate rows parsed from the sheet. GENERATOR_ADMIN only
// ever reads its assigned batch and writes photo/generation fields on existing Candidates.
const excelAssignmentSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    generatorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    templateId: { type: Schema.Types.ObjectId, ref: "CertificateTemplate", required: true },
    batchCode: { type: String, required: true, trim: true }, // e.g. Batch-001
    excelName: { type: String, required: true },
    sourceFileUrl: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(BATCH_STATUS),
      default: BATCH_STATUS.DRAFT,
    },
    assignedDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    maxGenerationCount: { type: Number, default: null },
    totalRecords: { type: Number, default: 0 },
    generatedCount: { type: Number, default: 0 },
    lockedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

excelAssignmentSchema.index({ organizationId: 1, status: 1 });
excelAssignmentSchema.index({ generatorId: 1, status: 1 });
excelAssignmentSchema.index({ organizationId: 1, batchCode: 1 }, { unique: true });

export type ExcelAssignmentDoc = InferSchemaType<typeof excelAssignmentSchema>;

export const ExcelAssignment: Model<ExcelAssignmentDoc> =
  models.ExcelAssignment || model<ExcelAssignmentDoc>("ExcelAssignment", excelAssignmentSchema);
