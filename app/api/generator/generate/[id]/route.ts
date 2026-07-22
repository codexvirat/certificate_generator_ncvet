import { NextResponse, type NextRequest } from "next/server";
import { requireActor, isActor, toErrorResponse } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/Candidate";
import { ExcelAssignment } from "@/models/ExcelAssignment";
import { CertificateTemplate } from "@/models/CertificateTemplate";
import { GeneratedCertificate } from "@/models/GeneratedCertificate";
import { generateCertificatePdf } from "@/services/certificateService";
import { markCandidateGenerated } from "@/services/candidateService";
import { uploadBuffer } from "@/lib/cloudinary";

// Generates (or regenerates, per the versioning policy) a candidate's certificate PDF.
// Scoping and the "own assigned batch, not locked" checks happen inside
// services/candidateService.ts#markCandidateGenerated.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!isActor(actor)) return actor;

  try {
    const { id } = await ctx.params;
    await connectDB();

    const candidate = await Candidate.findById(id);
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const assignment = await ExcelAssignment.findById(candidate.assignmentId);
    if (!assignment) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    const template = await CertificateTemplate.findById(assignment.templateId);
    if (!template) return NextResponse.json({ error: "Certificate template not found" }, { status: 404 });

    const { pdfBytes, hash, verificationUrl } = await generateCertificatePdf({ template, candidate });

    const nextVersion = (candidate.pdfVersion ?? 0) + 1;
    const { url: pdfUrl } = await uploadBuffer(
      Buffer.from(pdfBytes),
      "certificates",
      `${candidate.certificateNo}-v${nextVersion}`
    );

    const updated = await markCandidateGenerated({
      actor,
      candidateId: id,
      pdfUrl,
      pdfVersion: nextVersion,
    });

    // Append-only version history -- never overwrites a prior version's row.
    await GeneratedCertificate.create({
      candidateId: candidate._id,
      organizationId: candidate.organizationId,
      version: nextVersion,
      pdfUrl,
      hash,
      verificationId: candidate.verificationId,
      generatedBy: actor.id,
    });

    return NextResponse.json({ candidate: updated, verificationUrl, hash });
  } catch (err) {
    return toErrorResponse(err);
  }
}
