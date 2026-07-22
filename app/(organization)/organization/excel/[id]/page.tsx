"use client";

import { useEffect, useState, use } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ORG_ADMIN_NAV } from "@/components/dashboard/nav";
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
  generatorId: Generator | null;
};

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [selectedGenerator, setSelectedGenerator] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [batchRes, generatorsRes] = await Promise.all([
      fetch(`/api/organization/excel/${id}`),
      fetch("/api/organization/generators"),
    ]);
    const batchData = await batchRes.json();
    const generatorsData = await generatorsRes.json();
    setAssignment(batchData.assignment ?? null);
    setCandidates(batchData.candidates ?? []);
    setGenerators(generatorsData.generators ?? []);
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

  if (loading) {
    return (
      <DashboardShell title="Batch" nav={ORG_ADMIN_NAV}>
        <p className="text-sm text-zinc-500">Loading...</p>
      </DashboardShell>
    );
  }

  if (!assignment) {
    return (
      <DashboardShell title="Batch" nav={ORG_ADMIN_NAV}>
        <p className="text-sm text-red-600">Batch not found.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={`Batch ${assignment.batchCode}`} nav={ORG_ADMIN_NAV}>
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
          </div>
        </div>

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
                <tr key={c._id}>
                  <td className={tdClass}>{c.certificateNo}</td>
                  <td className={tdClass}>{c.name}</td>
                  <td className={tdClass}>{c.course}</td>
                  <td className={tdClass}>{c.photoUrl ? "Uploaded" : "Pending"}</td>
                  <td className={tdClass}>
                    {c.revoked ? (
                      <span className="text-red-600">Revoked</span>
                    ) : c.generated ? (
                      "Yes"
                    ) : (
                      "No"
                    )}
                  </td>
                  <td className={tdClass}>
                    <div className="flex gap-3">
                      {c.pdfUrl && (
                        <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                          View PDF
                        </a>
                      )}
                      {c.generated && !c.revoked && (
                        <button
                          onClick={() => handleRevoke(c._id)}
                          disabled={busy}
                          className="text-sm text-red-600 underline disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
