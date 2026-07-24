import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { CertificateTemplate } from "@/models/CertificateTemplate";
import { uploadBuffer } from "@/lib/storage";
import { ROLES } from "@/lib/constants";

// Uploads a certificate background + field layout. ORG_ADMIN (own org) or SUPER_ADMIN.
export async function GET() {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role === ROLES.GENERATOR_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const filter = actor.role === ROLES.SUPER_ADMIN ? {} : { organizationId: actor.organizationId };
  const templates = await CertificateTemplate.find(filter)
    .populate("organizationId", "name")
    .sort({ createdAt: -1 });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("background");
    const signatureFile = formData.get("signature");
    const name = formData.get("name");
    const organizationIdRaw = formData.get("organizationId");
    const organizationId = typeof organizationIdRaw === "string" ? organizationIdRaw : actor.organizationId;
    const qrPosition = formData.get("qrPosition");
    const photoPosition = formData.get("photoPosition");
    const signaturePosition = formData.get("signaturePosition");
    const textFields = formData.get("textFields");

    if (!(file instanceof File) || typeof name !== "string" || !organizationId) {
      return NextResponse.json(
        { error: "background, name and organizationId are required" },
        { status: 400 }
      );
    }
    if (actor.role === ROLES.ORG_ADMIN && organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Cannot upload a template for another organization" }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await connectDB();
    const { url: background } = await uploadBuffer(buffer, "certificate-templates");

    let signature: string | null = null;
    if (signatureFile instanceof File) {
      const signatureBuffer = Buffer.from(await signatureFile.arrayBuffer());
      const uploaded = await uploadBuffer(signatureBuffer, "certificate-templates");
      signature = uploaded.url;
    }

    const template = await CertificateTemplate.create({
      organizationId,
      name,
      background,
      signature,
      // "null" means the caller explicitly opted out of a QR overlay;
      // omitted entirely falls back to a default position for old clients.
      qrPosition: qrPosition === "null" ? null : qrPosition ? JSON.parse(String(qrPosition)) : { x: 480, y: 40, size: 80 },
      photoPosition: photoPosition ? JSON.parse(String(photoPosition)) : { x: 60, y: 300, width: 120, height: 150 },
      signaturePosition: signature
        ? signaturePosition
          ? JSON.parse(String(signaturePosition))
          : { x: 400, y: 60, width: 150, height: 60 }
        : null,
      textFields: textFields ? JSON.parse(String(textFields)) : [],
      createdBy: actor.id,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
