import ExcelJS from "exceljs";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/Candidate";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { AuditLog } from "@/models/AuditLog";
import { ACTIONS, assertCan } from "@/lib/permissions";
import { generateVerificationId } from "@/utils/tokens";
import { BATCH_STATUS } from "@/lib/constants";
import type { Role } from "@/lib/constants";

type Actor = { id: string; role: Role; organizationId: string | null };

const REQUIRED_COLUMNS = [
  "Certificate No",
  "Name",
  "Father Name",
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
 * Rows come solely from the assigned Excel sheet; there is no manual "add candidate" form.
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
  if (assignment.status !== BATCH_STATUS.DRAFT) {
    throw new Error(`Cannot import into a batch with status "${assignment.status}"`);
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

  const inserted = await Candidate.insertMany(rows, { ordered: true });

  assignment.totalRecords = inserted.length;
  assignment.excelName = assignment.excelName;
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
 * Freezes a batch so no further photo uploads or generation can happen --
 * per the spec's batch lifecycle (Draft -> Assigned -> In Progress -> Generated -> Locked).
 * ORG_ADMIN / SUPER_ADMIN only.
 */
export async function lockBatch(params: { actor: Actor; assignmentId: string; organizationId: string }) {
  assertCan(params.actor.role, ACTIONS.UPLOAD_EXCEL);
  await connectDB();

  const assignment = await ExcelAssignment.findOne({
    _id: params.assignmentId,
    organizationId: params.organizationId,
  });
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
