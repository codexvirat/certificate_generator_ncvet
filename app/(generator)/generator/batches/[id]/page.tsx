"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { GENERATOR_NAV } from "@/components/dashboard/nav";
import {
  cardClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  tableClass,
  thClass,
  tdClass,
  badgeClass,
} from "@/components/ui/classNames";

type Candidate = {
  _id: string;
  certificateNo: string;
  name: string;
  course: string;
  photoUrl: string | null;
  generated: boolean;
  pdfUrl: string | null;
  revoked: boolean;
};
type Assignment = {
  _id: string;
  batchCode: string;
  status: string;
  totalRecords: number;
  generatedCount: number;
};

export default function GeneratorBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/generator/batches/${id}`);
    const data = await res.json();
    if (res.ok) {
      setAssignment(data.assignment);
      setCandidates(data.candidates ?? []);
    } else {
      setError(data.error ?? "Failed to load batch");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const locked = assignment?.status === "locked";

  if (loading) {
    return (
      <DashboardShell title="Batch" nav={GENERATOR_NAV}>
        <p className="text-sm text-zinc-500">Loading...</p>
      </DashboardShell>
    );
  }

  if (!assignment) {
    return (
      <DashboardShell title="Batch" nav={GENERATOR_NAV}>
        <p className="text-sm text-red-600">{error ?? "Batch not found."}</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={`Batch ${assignment.batchCode}`} nav={GENERATOR_NAV}>
      <div className={`${cardClass} mb-6 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <span className={badgeClass}>{assignment.status.replace("_", " ")}</span>
          <span className="text-sm text-zinc-500">
            {assignment.generatedCount} / {assignment.totalRecords} generated
          </span>
          {locked && (
            <span className="text-sm text-amber-600">
              Locked -- photo uploads and generation are disabled.
            </span>
          )}
        </div>
        <a
          href={`/api/generator/batches/${id}/download-zip`}
          className={buttonSecondaryClass}
        >
          Download ZIP
        </a>
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-50">Candidates</h2>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Photo</th>
                <th className={thClass}>Certificate No</th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Course</th>
                <th className={thClass}>Status</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <CandidateRow
                  key={candidate._id}
                  candidate={candidate}
                  disabled={locked}
                  onChanged={load}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}

function CandidateRow({
  candidate,
  disabled,
  onChanged,
}: {
  candidate: Candidate;
  disabled: boolean;
  onChanged: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setBusy(true);
    const formData = new FormData();
    formData.append("photo", file);
    const res = await fetch(`/api/generator/candidates/${candidate._id}/photo`, {
      method: "POST",
      body: formData,
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Upload failed");
      return;
    }
    setFile(null);
    onChanged();
  }

  async function handleGenerate() {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/generator/generate/${candidate._id}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Generation failed");
      return;
    }
    onChanged();
  }

  return (
    <tr>
      <td className={tdClass}>
        {candidate.photoUrl ? (
          <div className="relative h-12 w-10 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
            <Image src={candidate.photoUrl} alt={candidate.name} fill className="object-cover" unoptimized />
          </div>
        ) : (
          <span className="text-xs text-zinc-400">No photo</span>
        )}
      </td>
      <td className={tdClass}>{candidate.certificateNo}</td>
      <td className={tdClass}>{candidate.name}</td>
      <td className={tdClass}>{candidate.course}</td>
      <td className={tdClass}>
        {candidate.revoked ? (
          <span className="text-red-600">Revoked</span>
        ) : candidate.generated ? (
          "Generated"
        ) : (
          "Pending"
        )}
      </td>
      <td className={tdClass}>
        <div className="flex flex-wrap items-center gap-2">
          {!disabled && (
            <>
              <input
                type="file"
                accept="image/*"
                className="max-w-[140px] text-xs"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={handleUpload}
                disabled={busy || !file}
                className={`${buttonSecondaryClass} px-2 py-1`}
              >
                Upload
              </button>
              <button
                onClick={handleGenerate}
                disabled={busy || !candidate.photoUrl || candidate.revoked}
                className={`${buttonPrimaryClass} px-2 py-1`}
              >
                {candidate.generated ? "Regenerate" : "Generate"}
              </button>
            </>
          )}
          {candidate.pdfUrl && (
            <a href={candidate.pdfUrl} target="_blank" rel="noreferrer" className="text-sm underline">
              View PDF
            </a>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}
