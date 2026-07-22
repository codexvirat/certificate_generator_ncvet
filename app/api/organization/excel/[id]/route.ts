import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { Candidate } from "@/models/Candidate";
import { ROLES } from "@/lib/constants";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN) {
    return NextResponse.json({ error: "Organization Admin only" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    await connectDB();

    const assignment = await ExcelAssignment.findOne({
      _id: id,
      organizationId: actor.organizationId,
    }).populate("generatorId", "name email");
    if (!assignment) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    const candidates = await Candidate.find({ assignmentId: id }).sort({ certificateNo: 1 });

    return NextResponse.json({ assignment, candidates });
  } catch (err) {
    return toErrorResponse(err);
  }
}
