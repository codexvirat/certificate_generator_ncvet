import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Organization } from "@/models/Organization";
import { AuditLog } from "@/models/AuditLog";
import { ROLES } from "@/lib/constants";

export async function GET() {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  await connectDB();
  const organizations = await Organization.find().sort({ createdAt: -1 });
  return NextResponse.json({ organizations });
}

export async function POST(req: NextRequest) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, address, website, certificatePrefix, qrDomain, logo } = body;
    if (!name || !email || !certificatePrefix || !qrDomain) {
      return NextResponse.json(
        { error: "name, email, certificatePrefix and qrDomain are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const organization = await Organization.create({
      name,
      email,
      address,
      website,
      certificatePrefix,
      qrDomain,
      logo,
      createdBy: actor.id,
    });

    await AuditLog.create({
      organizationId: organization._id,
      userId: actor.id,
      role: actor.role,
      action: "organization.create",
      targetType: "Organization",
      targetId: organization._id,
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
