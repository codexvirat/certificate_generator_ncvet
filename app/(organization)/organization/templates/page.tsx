"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ORG_ADMIN_NAV } from "@/components/dashboard/nav";
import { inputClass, labelClass, cardClass, buttonPrimaryClass } from "@/components/ui/classNames";

type Template = {
  _id: string;
  name: string;
  background: string;
  version: number;
  isActive: boolean;
};

const DEFAULT_TEXT_FIELDS = JSON.stringify(
  [
    { key: "NAME", x: 400, y: 300, fontSize: 28, align: "center" },
    { key: "COURSE", x: 400, y: 260, fontSize: 18, align: "center" },
    { key: "GRADE", x: 400, y: 230, fontSize: 16, align: "center" },
    { key: "ISSUE_DATE", x: 400, y: 100, fontSize: 14, align: "center" },
  ],
  null,
  2
);

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [background, setBackground] = useState<File | null>(null);
  const [qrPosition, setQrPosition] = useState({ x: 480, y: 40, size: 80 });
  const [photoPosition, setPhotoPosition] = useState({ x: 60, y: 300, width: 120, height: 150 });
  const [textFields, setTextFields] = useState(DEFAULT_TEXT_FIELDS);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/organization/templates");
    const data = await res.json();
    setTemplates(data.templates ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!background) {
      setError("Please choose a background image/PDF");
      return;
    }
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("background", background);
    formData.append("qrPosition", JSON.stringify(qrPosition));
    formData.append("photoPosition", JSON.stringify(photoPosition));
    formData.append("textFields", textFields);

    const res = await fetch("/api/organization/templates", { method: "POST", body: formData });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to upload template");
      return;
    }
    setName("");
    setBackground(null);
    load();
  }

  return (
    <DashboardShell title="Certificate Templates" nav={ORG_ADMIN_NAV}>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className={cardClass}>
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-50">Existing Templates</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-zinc-500">No templates uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {templates.map((template) => (
                <div key={template._id} className="rounded-lg border border-black/10 p-2 dark:border-white/10">
                  <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                    <Image
                      src={template.background}
                      alt={template.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {template.name}
                  </p>
                  <p className="text-xs text-zinc-500">v{template.version}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={cardClass}>
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-50">Upload Template</h2>

          <label className={labelClass}>Name</label>
          <input
            required
            className={`${inputClass} mb-3`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className={labelClass}>Background Image</label>
          <input
            required
            type="file"
            accept="image/*"
            className={`${inputClass} mb-3`}
            onChange={(e) => setBackground(e.target.files?.[0] ?? null)}
          />

          <p className={labelClass}>QR Position (x, y, size)</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <input
              type="number"
              className={inputClass}
              value={qrPosition.x}
              onChange={(e) => setQrPosition({ ...qrPosition, x: Number(e.target.value) })}
            />
            <input
              type="number"
              className={inputClass}
              value={qrPosition.y}
              onChange={(e) => setQrPosition({ ...qrPosition, y: Number(e.target.value) })}
            />
            <input
              type="number"
              className={inputClass}
              value={qrPosition.size}
              onChange={(e) => setQrPosition({ ...qrPosition, size: Number(e.target.value) })}
            />
          </div>

          <p className={labelClass}>Photo Position (x, y, width, height)</p>
          <div className="mb-3 grid grid-cols-4 gap-2">
            <input
              type="number"
              className={inputClass}
              value={photoPosition.x}
              onChange={(e) => setPhotoPosition({ ...photoPosition, x: Number(e.target.value) })}
            />
            <input
              type="number"
              className={inputClass}
              value={photoPosition.y}
              onChange={(e) => setPhotoPosition({ ...photoPosition, y: Number(e.target.value) })}
            />
            <input
              type="number"
              className={inputClass}
              value={photoPosition.width}
              onChange={(e) => setPhotoPosition({ ...photoPosition, width: Number(e.target.value) })}
            />
            <input
              type="number"
              className={inputClass}
              value={photoPosition.height}
              onChange={(e) => setPhotoPosition({ ...photoPosition, height: Number(e.target.value) })}
            />
          </div>

          <label className={labelClass}>Text Fields (JSON)</label>
          <textarea
            className={`${inputClass} mb-4 h-40 font-mono text-xs`}
            value={textFields}
            onChange={(e) => setTextFields(e.target.value)}
          />

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className={`${buttonPrimaryClass} w-full`}>
            {submitting ? "Uploading..." : "Upload Template"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
