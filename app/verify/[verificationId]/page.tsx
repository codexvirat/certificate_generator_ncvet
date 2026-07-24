import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/Candidate";
import { CertificateResultCard, type CertificateResult } from "@/components/verify/CertificateResultCard";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ verificationId: string }>;
}) {
  const { verificationId } = await params;
  await connectDB();

  const candidate = await Candidate.findOne({ verificationId, generated: true }).select(
    "certificateNo name course grade issueDate revoked revokedAt"
  );

  const result: CertificateResult = !candidate
    ? { status: "not-found" }
    : candidate.revoked
      ? {
          status: "revoked",
          certificateNo: candidate.certificateNo,
          revokedAt: candidate.revokedAt ? candidate.revokedAt.toISOString() : null,
        }
      : {
          status: "valid",
          certificateNo: candidate.certificateNo,
          name: candidate.name,
          course: candidate.course,
          grade: candidate.grade,
          issueDate: candidate.issueDate ? candidate.issueDate.toISOString() : null,
        };

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <CertificateResultCard result={result} />
      </div>
    </div>
  );
}
