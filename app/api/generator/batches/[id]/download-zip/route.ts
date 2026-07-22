import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { Candidate } from "@/models/Candidate";
import { buildCertificatesZip } from "@/services/zipService";
import { ROLES } from "@/lib/constants";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;
  if (actor.role !== ROLES.GENERATOR_ADMIN) {
    return NextResponse.json({ error: "Generator Admin only" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    await connectDB();

    const assignment = await ExcelAssignment.findOne({ _id: id, generatorId: actor.id });
    if (!assignment) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    const candidates = await Candidate.find({ assignmentId: id, generated: true }).select(
      "certificateNo pdfUrl"
    );
    if (candidates.length === 0) {
      return NextResponse.json({ error: "No generated certificates in this batch yet" }, { status: 400 });
    }

    const zip = await buildCertificatesZip(candidates);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${assignment.batchCode}.zip"`,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
