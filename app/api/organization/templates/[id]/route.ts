import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { CertificateTemplate } from "@/models/CertificateTemplate";
import { uploadBuffer } from "@/lib/storage";
import { ROLES } from "@/lib/constants";

// Edits an existing template's background/positions/text fields. Safe to do after the
// template has been assigned to batches -- certificates are rendered by reading the
// template live at generation time, so an edit here takes effect on the next (re)generate.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.ORG_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    await connectDB();

    const query =
      actor.role === ROLES.SUPER_ADMIN ? { _id: id } : { _id: id, organizationId: actor.organizationId };
    const template = await CertificateTemplate.findOne(query);
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("background");
    const signatureFile = formData.get("signature");
    const name = formData.get("name");
    const qrPosition = formData.get("qrPosition");
    const photoPosition = formData.get("photoPosition");
    const signaturePosition = formData.get("signaturePosition");
    const textFields = formData.get("textFields");

    if (typeof name === "string" && name.trim()) template.name = name;

    if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { url } = await uploadBuffer(buffer, "certificate-templates");
      template.background = url;
    }

    if (signatureFile instanceof File) {
      const signatureBuffer = Buffer.from(await signatureFile.arrayBuffer());
      const uploaded = await uploadBuffer(signatureBuffer, "certificate-templates");
      template.signature = uploaded.url;
    }

    if (qrPosition !== null) {
      template.qrPosition = qrPosition === "null" ? null : JSON.parse(String(qrPosition));
    }
    if (typeof photoPosition === "string") {
      template.photoPosition = JSON.parse(photoPosition);
    }
    if (signaturePosition !== null) {
      template.signaturePosition = signaturePosition === "null" ? null : JSON.parse(String(signaturePosition));
    }
    if (typeof textFields === "string") {
      template.textFields = JSON.parse(textFields);
    }

    template.version += 1;
    await template.save();

    return NextResponse.json({ template });
  } catch (err) {
    return toErrorResponse(err);
  }
}
