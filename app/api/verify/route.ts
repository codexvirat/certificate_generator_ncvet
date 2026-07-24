import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/Candidate";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Public, unauthenticated lookup by Certificate No (the number printed on the
// certificate itself, entered manually on the /verify landing page -- unlike
// the QR-code flow at /verify/[verificationId], this is deliberately
// enumerable by design per product decision.
export async function GET(req: NextRequest) {
  const certificateNo = req.nextUrl.searchParams.get("certificateNo")?.trim();
  if (!certificateNo) {
    return NextResponse.json({ error: "certificateNo is required" }, { status: 400 });
  }

  await connectDB();

  const candidate = await Candidate.findOne({
    certificateNo: new RegExp(`^${escapeRegExp(certificateNo)}$`, "i"),
    generated: true,
  }).select("certificateNo name course grade issueDate revoked revokedAt");

  if (!candidate) {
    return NextResponse.json({ status: "not-found" }, { status: 404 });
  }

  if (candidate.revoked) {
    return NextResponse.json({
      status: "revoked",
      certificateNo: candidate.certificateNo,
      revokedAt: candidate.revokedAt,
    });
  }

  return NextResponse.json({
    status: "valid",
    certificateNo: candidate.certificateNo,
    name: candidate.name,
    course: candidate.course,
    grade: candidate.grade,
    issueDate: candidate.issueDate,
  });
}
