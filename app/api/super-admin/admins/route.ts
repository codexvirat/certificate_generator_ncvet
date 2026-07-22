import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
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
  const admins = await User.find({ role: ROLES.ORG_ADMIN })
    .select("-password")
    .populate("organizationId", "name")
    .sort({ createdAt: -1 });
  return NextResponse.json({ admins });
}

// Creates an ORG_ADMIN account for an organization. SUPER_ADMIN only.
export async function POST(req: NextRequest) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  try {
    const { name, email, password, organizationId } = await req.json();
    if (!name || !email || !password || !organizationId) {
      return NextResponse.json(
        { error: "name, email, password and organizationId are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const organization = await Organization.findById(organizationId);
    if (!organization) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await User.create({
      name,
      email,
      password: passwordHash,
      role: ROLES.ORG_ADMIN,
      organizationId,
      createdBy: actor.id,
    });

    await AuditLog.create({
      organizationId,
      userId: actor.id,
      role: actor.role,
      action: "user.create.org_admin",
      targetType: "User",
      targetId: admin._id,
    });

    return NextResponse.json(
      { user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
