import { NextResponse } from "next/server";
import { requireActor, isActor } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { ROLES } from "@/lib/constants";

export async function GET() {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  await connectDB();
  const logs = await AuditLog.find()
    .populate("userId", "name email role")
    .populate("organizationId", "name")
    .sort({ createdAt: -1 })
    .limit(300);

  return NextResponse.json({ logs });
}
