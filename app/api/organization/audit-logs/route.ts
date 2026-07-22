import { NextResponse } from "next/server";
import { requireActor, isActor } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { ROLES } from "@/lib/constants";

export async function GET() {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN) {
    return NextResponse.json({ error: "Organization Admin only" }, { status: 403 });
  }

  await connectDB();
  const logs = await AuditLog.find({ organizationId: actor.organizationId })
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .limit(200);

  return NextResponse.json({ logs });
}
