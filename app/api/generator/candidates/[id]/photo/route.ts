import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { uploadCandidatePhoto } from "@/services/candidateService";
import { uploadBuffer } from "@/lib/cloudinary";
import sharp from "sharp";

// GENERATOR_ADMIN's photo upload. This is the ONLY write this role has onto a
// Candidate document, and it is scoped to their own assigned batch inside
// services/candidateService.ts -- see lib/permissions.ts for the full matrix.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;

  try {
    const { id } = await ctx.params;
    const formData = await req.formData();
    const file = formData.get("photo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "photo file is required" }, { status: 400 });
    }

    const rawBytes = Buffer.from(await file.arrayBuffer());
    // Compress + normalize before storing (spec: crop -> compress -> save).
    const compressed = await sharp(rawBytes)
      .resize(600, 750, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();

    const { url } = await uploadBuffer(compressed, "candidate-photos", id);

    const candidate = await uploadCandidatePhoto({ actor, candidateId: id, photoUrl: url });
    return NextResponse.json({ candidate });
  } catch (err) {
    return toErrorResponse(err);
  }
}
