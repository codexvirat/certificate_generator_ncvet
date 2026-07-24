export type CertificateResult =
  | { status: "not-found" }
  | { status: "revoked"; certificateNo: string; revokedAt: string | null }
  | {
      status: "valid";
      certificateNo: string;
      name: string;
      course: string;
      grade: string | null;
      issueDate: string | null;
    };

export function CertificateResultCard({ result }: { result: CertificateResult }) {
  if (result.status === "not-found") {
    return (
      <div className="text-center">
        <p className="text-3xl">✕</p>
        <h2 className="mt-2 text-lg font-semibold text-red-600">Certificate Not Found</h2>
        <p className="mt-1 text-sm text-zinc-500">No certificate matches what you entered.</p>
      </div>
    );
  }

  if (result.status === "revoked") {
    return (
      <div className="text-center">
        <p className="text-3xl">⚠</p>
        <h2 className="mt-2 text-lg font-semibold text-amber-600">Certificate Revoked</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {result.certificateNo} was revoked
          {result.revokedAt ? ` on ${new Date(result.revokedAt).toLocaleDateString()}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-3xl">✓</p>
      <h2 className="mt-2 text-lg font-semibold text-green-600">Certificate Valid</h2>
      <dl className="mt-4 space-y-2 text-left text-sm">
        <Row label="Certificate No" value={result.certificateNo} />
        <Row label="Name" value={result.name} />
        <Row label="Course" value={result.course} />
        <Row label="Grade" value={result.grade} />
        <Row
          label="Issue Date"
          value={result.issueDate ? new Date(result.issueDate).toLocaleDateString() : "-"}
        />
      </dl>
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
