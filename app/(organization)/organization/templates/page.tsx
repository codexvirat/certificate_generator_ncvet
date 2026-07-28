"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ORG_ADMIN_NAV } from "@/components/dashboard/nav";
import { inputClass, labelClass, cardClass, buttonPrimaryClass } from "@/components/ui/classNames";

type Position = { x: number; y: number; width?: number; height?: number; size?: number };
type TextField = {
  key: string;
  x: number;
  y: number;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  align?: "left" | "center" | "right";
};
type Template = {
  _id: string;
  name: string;
  background: string;
  signature: string | null;
  qrPosition: Position | null;
  photoPosition: Position;
  signaturePosition: Position | null;
  textFields: TextField[];
  version: number;
  isActive: boolean;
};

// Reference layout calibrated directly against the actual GD Goenka University
// skill-competency background image at its real 960x720 size (Name / Son of /
// DOB / Enrolment No / job role / Duration / Grade (placed at the "with" blank)
// / Date of Issue / Certificate No). Whatever size background actually gets
// uploaded, these are scaled to match it -- see scaleForImage() below. If
// you're using a different certificate design entirely, treat these as a
// starting point to adjust.
const REF_W = 960;
const REF_H = 720;
const REF_QR = { x: 52, y: 65, size: 100 };
const REF_PHOTO = { x: 778, y: 536, width: 130, height: 132 };
const REF_SIGNATURE = { x: 690, y: 140, width: 218, height: 60 };
const REF_TEXT_FIELDS = [
  { key: "CERTIFICATE_NO", x: 765, y: 492, fontSize: 15, align: "left" as const },
  { key: "NAME", x: 270, y: 446, fontSize: 20, align: "left" as const },
  { key: "FATHER_NAME", x: 160, y: 399, fontSize: 17, align: "left" as const },
  { key: "DOB", x: 515, y: 399, fontSize: 17, align: "left" as const },
  { key: "ENROLLMENT_NO", x: 778, y: 399, fontSize: 17, align: "left" as const },
  { key: "COURSE", x: 520, y: 356, fontSize: 17, align: "left" as const },
  { key: "DURATION", x: 135, y: 304, fontSize: 17, align: "left" as const },
  { key: "GRADE", x: 468, y: 304, fontSize: 17, align: "left" as const },
  { key: "ISSUE_DATE", x: 148, y: 256, fontSize: 17, align: "left" as const },
];

// Coordinates are absolute PDF points sized to whatever background image is
// uploaded -- a background at any other resolution needs every position
// rescaled or fields land off-page or in the wrong spot. Scale the reference
// layout (defined for a 1800x1350 image) to the real uploaded image's pixels.
function scaleForImage(width: number, height: number) {
  const sx = width / REF_W;
  const sy = height / REF_H;
  return {
    qrPosition: {
      x: Math.round(REF_QR.x * sx),
      y: Math.round(REF_QR.y * sy),
      size: Math.round(REF_QR.size * sx),
    },
    photoPosition: {
      x: Math.round(REF_PHOTO.x * sx),
      y: Math.round(REF_PHOTO.y * sy),
      width: Math.round(REF_PHOTO.width * sx),
      height: Math.round(REF_PHOTO.height * sy),
    },
    signaturePosition: {
      x: Math.round(REF_SIGNATURE.x * sx),
      y: Math.round(REF_SIGNATURE.y * sy),
      width: Math.round(REF_SIGNATURE.width * sx),
      height: Math.round(REF_SIGNATURE.height * sy),
    },
    textFields: REF_TEXT_FIELDS.map((f) => ({
      ...f,
      x: Math.round(f.x * sx),
      y: Math.round(f.y * sy),
      fontSize: Math.max(8, Math.round(f.fontSize * sx)),
    })),
  };
}

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("Could not read image dimensions"));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [background, setBackground] = useState<File | null>(null);
  const [backgroundSize, setBackgroundSize] = useState<{ width: number; height: number } | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [existingSignatureUrl, setExistingSignatureUrl] = useState<string | null>(null);
  const [includeQr, setIncludeQr] = useState(true);
  const [qrPosition, setQrPosition] = useState<Position>(REF_QR);
  const [photoPosition, setPhotoPosition] = useState<Position>(REF_PHOTO);
  const [signaturePosition, setSignaturePosition] = useState<Position>(REF_SIGNATURE);
  const [textFields, setTextFields] = useState(JSON.stringify(REF_TEXT_FIELDS, null, 2));

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

  async function handleBackgroundChange(file: File | null) {
    setBackground(file);
    if (!file) {
      setBackgroundSize(null);
      return;
    }
    try {
      const size = await readImageSize(file);
      setBackgroundSize(size);
      const scaled = scaleForImage(size.width, size.height);
      setQrPosition(scaled.qrPosition);
      setPhotoPosition(scaled.photoPosition);
      setSignaturePosition(scaled.signaturePosition);
      setTextFields(JSON.stringify(scaled.textFields, null, 2));
    } catch {
      setBackgroundSize(null);
    }
  }

  function startEdit(template: Template) {
    setEditingId(template._id);
    setError(null);
    setName(template.name);
    setBackground(null);
    setBackgroundSize(null);
    setSignature(null);
    setExistingSignatureUrl(template.signature);
    setIncludeQr(!!template.qrPosition);
    setQrPosition(template.qrPosition ?? REF_QR);
    setPhotoPosition(template.photoPosition);
    setSignaturePosition(template.signaturePosition ?? REF_SIGNATURE);
    setTextFields(JSON.stringify(template.textFields, null, 2));
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
    setName("");
    setBackground(null);
    setBackgroundSize(null);
    setSignature(null);
    setExistingSignatureUrl(null);
    setIncludeQr(true);
    setQrPosition(REF_QR);
    setPhotoPosition(REF_PHOTO);
    setSignaturePosition(REF_SIGNATURE);
    setTextFields(JSON.stringify(REF_TEXT_FIELDS, null, 2));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editingId && !background) {
      setError("Please choose a background image/PDF");
      return;
    }
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    if (background) formData.append("background", background);
    formData.append("qrPosition", includeQr ? JSON.stringify(qrPosition) : "null");
    formData.append("photoPosition", JSON.stringify(photoPosition));
    formData.append("textFields", textFields);
    if (signature) {
      formData.append("signature", signature);
      formData.append("signaturePosition", JSON.stringify(signaturePosition));
    } else if (editingId && existingSignatureUrl) {
      formData.append("signaturePosition", JSON.stringify(signaturePosition));
    }

    const res = await fetch(
      editingId ? `/api/organization/templates/${editingId}` : "/api/organization/templates",
      { method: editingId ? "PATCH" : "POST", body: formData }
    );
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save template");
      return;
    }
    cancelEdit();
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
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">v{template.version}</p>
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
              {editingId ? "Edit Template" : "Upload Template"}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs font-medium text-zinc-500 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>

          <label className={labelClass}>Name</label>
          <input
            required
            className={`${inputClass} mb-3`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className={labelClass}>
            Background Image {editingId && "(leave empty to keep current image)"}
          </label>
          <input
            required={!editingId}
            type="file"
            accept="image/*"
            className={`${inputClass} mb-1`}
            onChange={(e) => handleBackgroundChange(e.target.files?.[0] ?? null)}
          />
          <p className="mb-3 text-xs text-zinc-500">
            {backgroundSize
              ? `Detected ${backgroundSize.width} x ${backgroundSize.height}px -- positions below were auto-scaled to match.`
              : editingId
                ? "Adjust the positions below and save -- already-assigned batches pick up the change on their next certificate generation."
                : "Positions below auto-scale to whatever image you choose."}
          </p>

          <label className="mb-3 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={includeQr}
              onChange={(e) => setIncludeQr(e.target.checked)}
            />
            Include QR Code
          </label>

          {includeQr && (
            <>
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
            </>
          )}

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

          <label className={labelClass}>
            Signature Image (optional) {editingId && "-- leave empty to keep current signature"}
          </label>
          <input
            type="file"
            accept="image/*"
            className={`${inputClass} mb-3`}
            onChange={(e) => setSignature(e.target.files?.[0] ?? null)}
          />

          {(signature || existingSignatureUrl) && (
            <>
              <p className={labelClass}>Signature Position (x, y, width, height)</p>
              <div className="mb-3 grid grid-cols-4 gap-2">
                <input
                  type="number"
                  className={inputClass}
                  value={signaturePosition.x}
                  onChange={(e) => setSignaturePosition({ ...signaturePosition, x: Number(e.target.value) })}
                />
                <input
                  type="number"
                  className={inputClass}
                  value={signaturePosition.y}
                  onChange={(e) => setSignaturePosition({ ...signaturePosition, y: Number(e.target.value) })}
                />
                <input
                  type="number"
                  className={inputClass}
                  value={signaturePosition.width}
                  onChange={(e) =>
                    setSignaturePosition({ ...signaturePosition, width: Number(e.target.value) })
                  }
                />
                <input
                  type="number"
                  className={inputClass}
                  value={signaturePosition.height}
                  onChange={(e) =>
                    setSignaturePosition({ ...signaturePosition, height: Number(e.target.value) })
                  }
                />
              </div>
            </>
          )}

          <label className={labelClass}>Text Fields (JSON)</label>
          <textarea
            className={`${inputClass} mb-4 h-40 font-mono text-xs`}
            value={textFields}
            onChange={(e) => setTextFields(e.target.value)}
          />
          <p className="mb-4 text-xs text-zinc-500">
            Available keys: NAME, FATHER_NAME, DOB, ENROLLMENT_NO, COURSE, DURATION, GRADE,
            ISSUE_DATE, CERTIFICATE_NO. Coordinates are in PDF points, measured from the
            bottom-left corner of the background image at its native pixel size.
          </p>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className={`${buttonPrimaryClass} w-full`}>
            {submitting ? "Saving..." : editingId ? "Save Changes" : "Upload Template"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
