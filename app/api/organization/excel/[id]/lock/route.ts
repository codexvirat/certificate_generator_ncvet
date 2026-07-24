import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { lockBatch } from "@/services/excelService";
import { ROLES } from "@/lib/constants";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Organization Admin only" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const assignment = await lockBatch({ actor, assignmentId: id, organizationId: actor.organizationId });
    return NextResponse.json({ assignment });
  } catch (err) {
    return toErrorResponse(err);
  }
}
