import ExcelJS from "exceljs";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/Candidate";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { AuditLog } from "@/models/AuditLog";
import { ACTIONS, assertCan } from "@/lib/permissions";
import { generateVerificationId } from "@/utils/tokens";
import { BATCH_STATUS, ROLES } from "@/lib/constants";
import type { Role } from "@/lib/constants";

type Actor = { id: string; role: Role; organizationId: string | null };

const REQUIRED_COLUMNS = [
  "Certificate No",
  "Name",
  "Father Name",
  "DOB",
  "Enrolment No",
  "Course",
  "Duration",
  "Grade",
  "Start Date",
  "End Date",
  "Issue Date",
  "Remarks",
] as const;

/**
 * The ONLY code path allowed to create Candidate documents. Only reachable from
 * ORG_ADMIN / SUPER_ADMIN API routes -- GENERATOR_ADMIN never calls this.
 * Rows come solely from an Excel sheet; there is no manual "add candidate" form.
 * Also the path used to add more candidates to an already-created batch (any
 * status except LOCKED) -- totalRecords is incremented, never overwritten, so
 * this is safe to call repeatedly against the same assignment.
 */
export async function importCandidatesFromExcel(params: {
  actor: Actor;
  assignmentId: string;
  organizationId: string;
  fileBuffer: Buffer;
}) {
  assertCan(params.actor.role, ACTIONS.UPLOAD_EXCEL);

  await connectDB();

  const assignment = await ExcelAssignment.findOne({
    _id: params.assignmentId,
    organizationId: params.organizationId,
  });
  if (!assignment) throw new Error("Batch not found for this organization");
  if (assignment.status === BATCH_STATUS.LOCKED) {
    throw new Error("Batch is locked -- no further candidates can be added");
  }

  const workbook = new ExcelJS.Workbook();
  // exceljs resolves its Buffer type through fast-csv's pinned @types/node@14,
  // which conflicts with this project's @types/node -- runtime value is a plain
  // Buffer either way, this cast just bridges the two conflicting type declarations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(params.fileBuffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Excel file has no worksheet");

  const headerRow = sheet.getRow(1).values as unknown[];
  const headers = headerRow.map((h) => String(h ?? "").trim());
  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      throw new Error(`Missing required column "${col}" in uploaded Excel`);
    }
  }

  const colIndex = (name: string) => headers.indexOf(name);

  const rows: Array<Record<string, unknown>> = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const get = (name: string) => row.getCell(colIndex(name)).value;
    const certificateNo = String(get("Certificate No") ?? "").trim();
    if (!certificateNo) return; // skip blank rows

    rows.push({
      assignmentId: assignment._id,
      organizationId: params.organizationId,
      certificateNo,
      name: String(get("Name") ?? "").trim(),
      fatherName: String(get("Father Name") ?? "").trim(),
      dob: get("DOB") ? new Date(get("DOB") as string) : null,
      enrollmentNo: String(get("Enrolment No") ?? "").trim(),
      course: String(get("Course") ?? "").trim(),
      duration: String(get("Duration") ?? "").trim(),
      grade: String(get("Grade") ?? "").trim(),
      startDate: get("Start Date") ? new Date(get("Start Date") as string) : null,
      endDate: get("End Date") ? new Date(get("End Date") as string) : null,
      issueDate: get("Issue Date") ? new Date(get("Issue Date") as string) : null,
      remarks: String(get("Remarks") ?? "").trim(),
      verificationId: generateVerificationId(),
      // photo/generated/pdf fields intentionally omitted -- default empty until
      // the assigned GENERATOR_ADMIN uploads a photo and generates.
    });
  });

  if (rows.length === 0) throw new Error("No candidate rows found in Excel");

  let inserted;
  try {
    inserted = await Candidate.insertMany(rows, { ordered: true });
  } catch (err) {
    // insertMany({ordered:true}) may have already persisted rows before the
    // one that failed (e.g. a duplicate Certificate No partway through) --
    // clean up exactly those rows (and only those, never pre-existing ones)
    // so a retry with a fixed file doesn't collide with leftover partial rows.
    const partiallyInserted = (err as { insertedDocs?: Array<{ _id: unknown }> })?.insertedDocs ?? [];
    if (partiallyInserted.length > 0) {
      await Candidate.deleteMany({ _id: { $in: partiallyInserted.map((d) => d._id) } });
    }
    throw err;
  }

  assignment.totalRecords += inserted.length;
  // Adding more (ungenerated) candidates to a batch previously marked fully
  // GENERATED means it's no longer fully done -- reflect that in status.
  if (assignment.status === BATCH_STATUS.GENERATED) {
    assignment.status = BATCH_STATUS.IN_PROGRESS;
  }
  await assignment.save();

  await AuditLog.create({
    organizationId: params.organizationId,
    userId: params.actor.id,
    role: params.actor.role,
    action: "excel.import",
    targetType: "ExcelAssignment",
    targetId: assignment._id,
    metadata: { rowCount: inserted.length },
  });

  return { assignment, count: inserted.length };
}

/**
 * Deletes a batch and all of its candidates. ORG_ADMIN (own org) or SUPER_ADMIN
 * (any org). Deliberately allowed regardless of status -- callers should warn
 * the user in the UI if certificates were already generated, since those
 * verification links stop resolving once the candidate rows are gone.
 */
export async function deleteBatch(params: { actor: Actor; assignmentId: string; organizationId: string | null }) {
  assertCan(params.actor.role, ACTIONS.UPLOAD_EXCEL);
  await connectDB();

  const query =
    params.actor.role === ROLES.SUPER_ADMIN
      ? { _id: params.assignmentId }
      : { _id: params.assignmentId, organizationId: params.organizationId };
  const assignment = await ExcelAssignment.findOne(query);
  if (!assignment) throw new Error("Batch not found for this organization");

  const { deletedCount: candidateCount } = await Candidate.deleteMany({ assignmentId: assignment._id });
  await ExcelAssignment.deleteOne({ _id: assignment._id });

  await AuditLog.create({
    organizationId: assignment.organizationId,
    userId: params.actor.id,
    role: params.actor.role,
    action: "batch.delete",
    targetType: "ExcelAssignment",
    targetId: assignment._id,
    metadata: { batchCode: assignment.batchCode, candidateCount, generatedCount: assignment.generatedCount },
  });

  return { batchCode: assignment.batchCode, candidateCount };
}

/**
 * Freezes a batch so no further photo uploads or generation can happen --
 * per the spec's batch lifecycle (Draft -> Assigned -> In Progress -> Generated -> Locked).
 * ORG_ADMIN / SUPER_ADMIN only.
 */
export async function lockBatch(params: { actor: Actor; assignmentId: string; organizationId: string | null }) {
  assertCan(params.actor.role, ACTIONS.UPLOAD_EXCEL);
  await connectDB();

  const query =
    params.actor.role === ROLES.SUPER_ADMIN
      ? { _id: params.assignmentId }
      : { _id: params.assignmentId, organizationId: params.organizationId };
  const assignment = await ExcelAssignment.findOne(query);
  if (!assignment) throw new Error("Batch not found for this organization");

  assignment.status = BATCH_STATUS.LOCKED;
  assignment.lockedAt = new Date();
  await assignment.save();

  await AuditLog.create({
    organizationId: params.organizationId,
    userId: params.actor.id,
    role: params.actor.role,
    action: "batch.lock",
    targetType: "ExcelAssignment",
    targetId: assignment._id,
  });

  return assignment;
}
