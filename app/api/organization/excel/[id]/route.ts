import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { Candidate } from "@/models/Candidate";
import { deleteBatch } from "@/services/excelService";
import { ROLES } from "@/lib/constants";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Organization Admin only" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    await connectDB();

    const query = actor.role === ROLES.SUPER_ADMIN ? { _id: id } : { _id: id, organizationId: actor.organizationId };
    const assignment = await ExcelAssignment.findOne(query)
      .populate("organizationId", "name")
      .populate("generatorId", "name email");
    if (!assignment) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    const candidates = await Candidate.find({ assignmentId: id }).sort({ certificateNo: 1 });

    return NextResponse.json({ assignment, candidates });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// Deletes a batch and all its candidates. ORG_ADMIN (own org) or SUPER_ADMIN (any org).
// The UI is responsible for warning the caller if certificates were already
// generated, since their verification links stop resolving once this runs.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Organization Admin only" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const result = await deleteBatch({
      actor,
      assignmentId: id,
      organizationId: actor.organizationId,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
