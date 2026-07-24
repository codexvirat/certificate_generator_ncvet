"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SUPER_ADMIN_NAV } from "@/components/dashboard/nav";
import {
  inputClass,
  cardClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonDangerClass,
  tableClass,
  thClass,
  tdClass,
  badgeClass,
} from "@/components/ui/classNames";

type Generator = { _id: string; name: string; email: string };
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
  organizationId: { _id: string; name: string } | null;
  generatorId: Generator | null;
};

export default function SuperAdminBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [selectedGenerator, setSelectedGenerator] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addFile, setAddFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    const batchRes = await fetch(`/api/organization/excel/${id}`);
    const batchData = await batchRes.json();
    const loadedAssignment: Assignment | null = batchData.assignment ?? null;
    setAssignment(loadedAssignment);
    setCandidates(batchData.candidates ?? []);

    if (loadedAssignment?.organizationId?._id) {
      const generatorsRes = await fetch(
        `/api/organization/generators?organizationId=${loadedAssignment.organizationId._id}`
      );
      const generatorsData = await generatorsRes.json();
      setGenerators(generatorsData.generators ?? []);
    } else {
      setGenerators([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAssign() {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/organization/excel/${id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generatorId: selectedGenerator }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to assign batch");
      return;
    }
    load();
  }

  async function handleLock() {
    if (!confirm("Lock this batch? No further photo uploads or generation will be possible.")) return;
    setBusy(true);
    const res = await fetch(`/api/organization/excel/${id}/lock`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to lock batch");
      return;
    }
    load();
  }

  async function handleRevoke(candidateId: string) {
    const reason = prompt("Reason for revoking this certificate?");
    if (reason === null) return;
    setBusy(true);
    const res = await fetch(`/api/organization/candidates/${candidateId}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to revoke certificate");
      return;
    }
    load();
  }

  function handleDownloadZip() {
    window.location.href = `/api/organization/excel/${id}/download-zip`;
  }

  async function handleAddCandidates(e: React.FormEvent) {
    e.preventDefault();
    if (!addFile) return;
    setError(null);
    setBusy(true);
    const formData = new FormData();
    formData.append("file", addFile);
    const res = await fetch(`/api/organization/excel/${id}/import`, { method: "POST", body: formData });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add candidates");
      return;
    }
    setAddFile(null);
    load();
  }

  async function handleDeleteBatch() {
    if (!assignment) return;
    const warning =
      assignment.generatedCount > 0
        ? `This batch has ${assignment.generatedCount} already-generated certificate(s) -- deleting it will permanently remove those candidates and their QR verification links will stop working. Delete anyway?`
        : `Delete batch "${assignment.batchCode}" and all its candidates? This cannot be undone.`;
    if (!confirm(warning)) return;
    setBusy(true);
    const res = await fetch(`/api/organization/excel/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete batch");
      return;
    }
    router.push("/super-admin/excel");
  }

  if (loading) {
    return (
      <DashboardShell title="Batch" nav={SUPER_ADMIN_NAV}>
        <p className="text-sm text-zinc-500">Loading...</p>
      </DashboardShell>
    );
  }

  if (!assignment) {
    return (
      <DashboardShell title="Batch" nav={SUPER_ADMIN_NAV}>
        <p className="text-sm text-red-600">Batch not found.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={`Batch ${assignment.batchCode}`}
      subtitle={assignment.organizationId?.name}
      nav={SUPER_ADMIN_NAV}
    >
      <div className={`${cardClass} mb-6`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={badgeClass}>{assignment.status.replace("_", " ")}</span>
            <span className="text-sm text-zinc-500">
              {assignment.generatedCount} / {assignment.totalRecords} generated
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadZip} className={buttonSecondaryClass}>
              Download ZIP
            </button>
            {assignment.status !== "locked" && (
              <button onClick={handleLock} disabled={busy} className={buttonDangerClass}>
                Lock Batch
              </button>
            )}
            <button onClick={handleDeleteBatch} disabled={busy} className={buttonDangerClass}>
              Delete Batch
            </button>
          </div>
        </div>

        {assignment.status !== "locked" && (
          <form onSubmit={handleAddCandidates} className="mb-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                Add More Candidates (Excel)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className={inputClass}
                onChange={(e) => setAddFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <button type="submit" disabled={busy || !addFile} className={buttonPrimaryClass}>
              Add
            </button>
          </form>
        )}

        {assignment.status === "draft" && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                Assign to Generator
              </label>
              <select
                className={inputClass}
                value={selectedGenerator}
                onChange={(e) => setSelectedGenerator(e.target.value)}
              >
                <option value="">Select generator admin</option>
                {generators.map((gen) => (
                  <option key={gen._id} value={gen._id}>
                    {gen.name} ({gen.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAssign}
              disabled={busy || !selectedGenerator}
              className={buttonPrimaryClass}
            >
              Assign
            </button>
          </div>
        )}

        {assignment.generatorId && (
          <p className="mt-2 text-sm text-zinc-500">
            Assigned to {assignment.generatorId.name} ({assignment.generatorId.email})
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className={cardClass}>
        <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-50">Candidates</h2>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Certificate No</th>
                <th className={thClass}>Name</th>
                <th className={thClass}>Course</th>
                <th className={thClass}>Photo</th>
                <th className={thClass}>Generated</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <CandidateRow
                  key={c._id}
                  candidate={c}
                  locked={assignment.status === "locked"}
                  onRevoke={handleRevoke}
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
  locked,
  onRevoke,
  onChanged,
}: {
  candidate: Candidate;
  locked: boolean;
  onRevoke: (candidateId: string) => void;
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
      <td className={tdClass}>{candidate.certificateNo}</td>
      <td className={tdClass}>{candidate.name}</td>
      <td className={tdClass}>{candidate.course}</td>
      <td className={tdClass}>
        <div className="flex flex-col gap-1">
          <span>{candidate.photoUrl ? "Uploaded" : "Pending"}</span>
          {!locked && !candidate.revoked && (
            <div className="flex items-center gap-1.5">
              <input
                type="file"
                accept="image/*"
                className="max-w-[100px] text-xs"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={handleUpload}
                disabled={busy || !file}
                className={`${buttonSecondaryClass} px-1.5 py-0.5 text-xs`}
              >
                Upload
              </button>
            </div>
          )}
        </div>
      </td>
      <td className={tdClass}>
        {candidate.revoked ? (
          <span className="text-red-600">Revoked</span>
        ) : candidate.generated ? (
          "Yes"
        ) : (
          "No"
        )}
      </td>
      <td className={tdClass}>
        <div className="flex flex-wrap items-center gap-3">
          {!locked && !candidate.revoked && (
            <button
              onClick={handleGenerate}
              disabled={busy || !candidate.photoUrl}
              className={`${buttonPrimaryClass} px-2 py-1`}
            >
              {candidate.generated ? "Regenerate" : "Generate"}
            </button>
          )}
          {candidate.pdfUrl && (
            <a href={candidate.pdfUrl} target="_blank" rel="noreferrer" className="text-sm underline">
              View PDF
            </a>
          )}
          {candidate.generated && !candidate.revoked && (
            <button
              onClick={() => onRevoke(candidate._id)}
              disabled={busy}
              className="text-sm text-red-600 underline disabled:opacity-50"
            >
              Revoke
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}
