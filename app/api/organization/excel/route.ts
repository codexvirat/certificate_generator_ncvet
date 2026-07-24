import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { importCandidatesFromExcel } from "@/services/excelService";
import { uploadBuffer } from "@/lib/storage";
import { ROLES, BATCH_STATUS } from "@/lib/constants";

export async function GET() {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Organization Admin only" }, { status: 403 });
  }

  await connectDB();
  const filter = actor.role === ROLES.SUPER_ADMIN ? {} : { organizationId: actor.organizationId };
  const batches = await ExcelAssignment.find(filter)
    .populate("organizationId", "name")
    .populate("generatorId", "name email")
    .populate("templateId", "name")
    .sort({ createdAt: -1 });

  return NextResponse.json({ batches });
}

// Creates a new batch (ExcelAssignment) and imports its Candidate rows.
// ORG_ADMIN (own org) or SUPER_ADMIN (any org, via explicit organizationId) --
// this is the sole entry point that creates Candidate documents.
export async function POST(req: NextRequest) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;

  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json(
      { error: "Only an Organization Admin or Super Admin can upload and import an Excel batch" },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const templateId = formData.get("templateId");
    const batchCode = formData.get("batchCode");
    const organizationIdRaw = formData.get("organizationId");
    const organizationId =
      actor.role === ROLES.SUPER_ADMIN
        ? typeof organizationIdRaw === "string"
          ? organizationIdRaw
          : null
        : actor.organizationId;

    if (
      !(file instanceof File) ||
      typeof templateId !== "string" ||
      typeof batchCode !== "string" ||
      !organizationId
    ) {
      return NextResponse.json(
        { error: "file, templateId, batchCode and organizationId are required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await connectDB();
    const { url: sourceFileUrl } = await uploadBuffer(buffer, "excel-uploads");

    const assignment = await ExcelAssignment.create({
      organizationId,
      templateId,
      batchCode,
      excelName: file.name,
      sourceFileUrl,
      status: BATCH_STATUS.DRAFT,
      createdBy: actor.id,
    });

    try {
      const { count } = await importCandidatesFromExcel({
        actor,
        assignmentId: assignment._id.toString(),
        organizationId,
        fileBuffer: buffer,
      });
      return NextResponse.json({ assignment, candidateCount: count }, { status: 201 });
    } catch (importErr) {
      // Row import failed (bad columns, duplicate certificate numbers, etc.) --
      // importCandidatesFromExcel already cleaned up any rows it managed to
      // insert before failing, so it's safe to just remove the empty batch
      // shell here rather than leave a permanently un-importable draft behind.
      await ExcelAssignment.deleteOne({ _id: assignment._id });
      throw importErr;
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
