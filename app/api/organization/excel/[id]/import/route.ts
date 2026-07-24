import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { importCandidatesFromExcel } from "@/services/excelService";
import { ROLES } from "@/lib/constants";

// Adds more candidate rows to an already-created batch (any status except
// LOCKED). ORG_ADMIN (own org) or SUPER_ADMIN (any org).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json(
      { error: "Only an Organization Admin or Super Admin can add candidates to a batch" },
      { status: 403 }
    );
  }

  try {
    const { id } = await ctx.params;
    await connectDB();

    const query = actor.role === ROLES.SUPER_ADMIN ? { _id: id } : { _id: id, organizationId: actor.organizationId };
    const assignment = await ExcelAssignment.findOne(query);
    if (!assignment) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { count } = await importCandidatesFromExcel({
      actor,
      assignmentId: id,
      organizationId: assignment.organizationId.toString(),
      fileBuffer: buffer,
    });

    return NextResponse.json({ candidateCount: count });
  } catch (err) {
    return toErrorResponse(err);
  }
}
