import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { importCandidatesFromExcel } from "@/services/excelService";
import { uploadBuffer } from "@/lib/cloudinary";
import { ROLES, BATCH_STATUS } from "@/lib/constants";

// Creates a new batch (ExcelAssignment) and imports its Candidate rows.
// ORG_ADMIN only -- this is the sole entry point that creates Candidate documents.
export async function POST(req: NextRequest) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;

  if (actor.role !== ROLES.ORG_ADMIN || !actor.organizationId) {
    return NextResponse.json(
      { error: "Only an Organization Admin can upload and import an Excel batch" },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const templateId = formData.get("templateId");
    const batchCode = formData.get("batchCode");

    if (!(file instanceof File) || typeof templateId !== "string" || typeof batchCode !== "string") {
      return NextResponse.json(
        { error: "file, templateId and batchCode are required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await connectDB();
    const { url: sourceFileUrl } = await uploadBuffer(buffer, "excel-uploads");

    const assignment = await ExcelAssignment.create({
      organizationId: actor.organizationId,
      templateId,
      batchCode,
      excelName: file.name,
      sourceFileUrl,
      status: BATCH_STATUS.DRAFT,
      createdBy: actor.id,
    });

    const { count } = await importCandidatesFromExcel({
      actor,
      assignmentId: assignment._id.toString(),
      organizationId: actor.organizationId,
      fileBuffer: buffer,
    });

    return NextResponse.json({ assignment, candidateCount: count }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
