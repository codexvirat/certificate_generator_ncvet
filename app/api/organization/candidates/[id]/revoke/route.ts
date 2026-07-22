import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { revokeCertificate } from "@/services/candidateService";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;

  try {
    const { id } = await ctx.params;
    const { reason } = await req.json();
    const candidate = await revokeCertificate({ actor, candidateId: id, reason: reason ?? "" });
    return NextResponse.json({ candidate });
  } catch (err) {
    return toErrorResponse(err);
  }
}
