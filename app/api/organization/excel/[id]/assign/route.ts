import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { User } from "@/models/User";
import { ROLES, BATCH_STATUS } from "@/lib/constants";

// Assigns an already-imported batch to a GENERATOR_ADMIN. ORG_ADMIN (own org) or SUPER_ADMIN (any org).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;

  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json(
      { error: "Only an Organization Admin or Super Admin can assign a batch" },
      { status: 403 }
    );
  }

  try {
    const { id } = await ctx.params;
    const { generatorId, expiryDate, maxGenerationCount } = await req.json();

    await connectDB();

    const query =
      actor.role === ROLES.SUPER_ADMIN ? { _id: id } : { _id: id, organizationId: actor.organizationId };
    const assignment = await ExcelAssignment.findOne(query);
    if (!assignment) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    if (assignment.status !== BATCH_STATUS.DRAFT) {
      return NextResponse.json({ error: `Batch already in status "${assignment.status}"` }, { status: 400 });
    }

    const generator = await User.findOne({
      _id: generatorId,
      organizationId: assignment.organizationId,
      role: ROLES.GENERATOR_ADMIN,
    });
    if (!generator) {
      return NextResponse.json({ error: "Generator not found in this organization" }, { status: 404 });
    }

    assignment.generatorId = generator._id;
    assignment.status = BATCH_STATUS.ASSIGNED;
    assignment.assignedDate = new Date();
    if (expiryDate) assignment.expiryDate = new Date(expiryDate);
    if (maxGenerationCount) assignment.maxGenerationCount = maxGenerationCount;
    await assignment.save();

    return NextResponse.json({ assignment });
  } catch (err) {
    return toErrorResponse(err);
  }
}
