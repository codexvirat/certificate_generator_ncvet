import { connectDB } from "@/lib/db";
import { Candidate } from "@/models/Candidate";

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

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-950">
        {!candidate ? (
          <>
            <p className="text-3xl">✕</p>
            <h1 className="mt-2 text-lg font-semibold text-red-600">Certificate Not Found</h1>
            <p className="mt-1 text-sm text-zinc-500">
              No certificate matches this verification code.
            </p>
          </>
        ) : candidate.revoked ? (
          <>
            <p className="text-3xl">⚠</p>
            <h1 className="mt-2 text-lg font-semibold text-amber-600">Certificate Revoked</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {candidate.certificateNo} was revoked on{" "}
              {candidate.revokedAt ? new Date(candidate.revokedAt).toLocaleDateString() : ""}.
            </p>
          </>
        ) : (
          <>
            <p className="text-3xl">✓</p>
            <h1 className="mt-2 text-lg font-semibold text-green-600">Certificate Valid</h1>
            <dl className="mt-4 space-y-2 text-left text-sm">
              <Row label="Certificate No" value={candidate.certificateNo} />
              <Row label="Name" value={candidate.name} />
              <Row label="Course" value={candidate.course} />
              <Row label="Grade" value={candidate.grade} />
              <Row
                label="Issue Date"
                value={candidate.issueDate ? new Date(candidate.issueDate).toLocaleDateString() : "-"}
              />
            </dl>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b border-black/5 py-1.5 dark:border-white/5">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-900 dark:text-zinc-50">{value || "-"}</dd>
    </div>
  );
}
