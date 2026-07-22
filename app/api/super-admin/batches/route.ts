import { NextResponse } from "next/server";
import { requireActor, isActor } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { ROLES } from "@/lib/constants";

// Read-only oversight across all organizations -- Super Admin cannot create or
// edit batches directly (see permission matrix), only view status/progress.
export async function GET() {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  await connectDB();
  const batches = await ExcelAssignment.find()
    .populate("organizationId", "name")
    .populate("generatorId", "name email")
    .sort({ createdAt: -1 });

  return NextResponse.json({ batches });
}
