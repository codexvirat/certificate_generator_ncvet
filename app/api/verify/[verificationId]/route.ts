import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/Candidate";

// Public, unauthenticated lookup by the non-guessable verificationId embedded
// in the certificate's QR code. Returns only what's needed to confirm validity --
// never the full candidate record.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ verificationId: string }> }) {
  const { verificationId } = await ctx.params;
  await connectDB();

  const candidate = await Candidate.findOne({ verificationId, generated: true }).select(
    "certificateNo name course grade issueDate revoked revokedAt organizationId"
  );

  if (!candidate) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({
    valid: !candidate.revoked,
    certificateNo: candidate.certificateNo,
    name: candidate.name,
    course: candidate.course,
    grade: candidate.grade,
    issueDate: candidate.issueDate,
    revoked: candidate.revoked,
    revokedAt: candidate.revokedAt,
  });
}
