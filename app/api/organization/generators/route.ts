import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { AuditLog } from "@/models/AuditLog";
import { ROLES } from "@/lib/constants";

// Creates a GENERATOR_ADMIN account. ORG_ADMIN is scoped to their own
// organization; SUPER_ADMIN may act on any organization via an explicit
// organizationId (query param on GET, body field on POST).
export async function GET(req: NextRequest) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Organization Admin only" }, { status: 403 });
  }
  await connectDB();

  const filter: Record<string, unknown> = { role: ROLES.GENERATOR_ADMIN };
  if (actor.role === ROLES.ORG_ADMIN) {
    filter.organizationId = actor.organizationId;
  } else {
    const organizationId = req.nextUrl.searchParams.get("organizationId");
    if (organizationId) filter.organizationId = organizationId;
  }

  const generators = await User.find(filter)
    .populate("organizationId", "name")
    .sort({ createdAt: -1 });
  return NextResponse.json({ generators });
}

export async function POST(req: NextRequest) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Organization Admin only" }, { status: 403 });
  }

  try {
    const { name, email, password, organizationId: organizationIdRaw } = await req.json();
    const organizationId = actor.role === ROLES.SUPER_ADMIN ? organizationIdRaw : actor.organizationId;
    if (!name || !email || !password || !organizationId) {
      return NextResponse.json(
        { error: "name, email, password and organizationId are required" },
        { status: 400 }
      );
    }

    await connectDB();
    if (actor.role === ROLES.SUPER_ADMIN) {
      const organization = await Organization.findById(organizationId);
      if (!organization) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const generator = await User.create({
      name,
      email,
      password: passwordHash,
      role: ROLES.GENERATOR_ADMIN,
      organizationId,
      createdBy: actor.id,
    });

    await AuditLog.create({
      organizationId,
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
