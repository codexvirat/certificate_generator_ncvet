"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ORG_ADMIN_NAV } from "@/components/dashboard/nav";
import {
  inputClass,
  labelClass,
  cardClass,
  buttonPrimaryClass,
  tableClass,
  thClass,
  tdClass,
  badgeClass,
} from "@/components/ui/classNames";

type Template = { _id: string; name: string };
type Batch = {
  _id: string;
  batchCode: string;
  excelName: string;
  status: string;
  totalRecords: number;
  generatedCount: number;
  generatorId: { name: string } | null;
  templateId: { name: string } | null;
};

export default function ExcelBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [batchCode, setBatchCode] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    const [batchesRes, templatesRes] = await Promise.all([
      fetch("/api/organization/excel"),
      fetch("/api/organization/templates"),
    ]);
    const batchesData = await batchesRes.json();
    const templatesData = await templatesRes.json();
    setBatches(batchesData.batches ?? []);
    setTemplates(templatesData.templates ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Please choose an Excel file");
      return;
    }
    setSubmitting(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("templateId", templateId);
    formData.append("batchCode", batchCode);

    const res = await fetch("/api/organization/excel", { method: "POST", body: formData });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to upload Excel");
      return;
    }
    setBatchCode("");
    setFile(null);
    load();
  }

  return (
    <DashboardShell title="Excel Batches" nav={ORG_ADMIN_NAV}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className={cardClass}>
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-50">Batches</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : batches.length === 0 ? (
            <p className="text-sm text-zinc-500">No batches yet -- upload an Excel sheet to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Batch</th>
                    <th className={thClass}>Template</th>
                    <th className={thClass}>Generator</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Progress</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch._id}>
                      <td className={tdClass}>{batch.batchCode}</td>
                      <td className={tdClass}>{batch.templateId?.name ?? "-"}</td>
                      <td className={tdClass}>{batch.generatorId?.name ?? "Unassigned"}</td>
                      <td className={tdClass}>
                        <span className={badgeClass}>{batch.status.replace("_", " ")}</span>
                      </td>
                      <td className={tdClass}>
                        {batch.generatedCount} / {batch.totalRecords}
                      </td>
                      <td className={tdClass}>
                        <Link href={`/organization/excel/${batch._id}`} className="text-sm underline">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={cardClass}>
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-50">Upload Excel Batch</h2>

          <label className={labelClass}>Batch Code</label>
          <input
            required
            placeholder="Batch-001"
            className={`${inputClass} mb-3`}
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
          />

          <label className={labelClass}>Certificate Template</label>
          <select
            required
            className={`${inputClass} mb-3`}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">Select template</option>
            {templates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.name}
              </option>
            ))}
          </select>

          <label className={labelClass}>Excel File</label>
          <input
            required
            type="file"
            accept=".xlsx,.xls"
            className={`${inputClass} mb-4`}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <p className="mb-4 text-xs text-zinc-500">
            Required columns: Certificate No, Name, Father Name, Course, Duration, Grade, Start
            Date, End Date, Issue Date, Remarks.
          </p>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className={`${buttonPrimaryClass} w-full`}>
            {submitting ? "Uploading..." : "Upload & Import"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
