import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { ROLES } from "@/lib/constants";

// Creates a GENERATOR_ADMIN account, scoped to the calling Org Admin's own organization.
export async function GET() {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN) {
    return NextResponse.json({ error: "Organization Admin only" }, { status: 403 });
  }
  await connectDB();
  const generators = await User.find({
    organizationId: actor.organizationId,
    role: ROLES.GENERATOR_ADMIN,
  }).sort({ createdAt: -1 });
  return NextResponse.json({ generators });
}

export async function POST(req: NextRequest) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN || !actor.organizationId) {
    return NextResponse.json({ error: "Organization Admin only" }, { status: 403 });
  }

  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
    }

    await connectDB();
    const passwordHash = await bcrypt.hash(password, 12);
    const generator = await User.create({
      name,
      email,
      password: passwordHash,
      role: ROLES.GENERATOR_ADMIN,
      organizationId: actor.organizationId,
      createdBy: actor.id,
    });

    await AuditLog.create({
      organizationId: actor.organizationId,
      userId: actor.id,
      role: actor.role,
      action: "user.create.generator_admin",
      targetType: "User",
      targetId: generator._id,
    });

    return NextResponse.json(
      { user: { id: generator._id, name: generator.name, email: generator.email, role: generator.role } },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
