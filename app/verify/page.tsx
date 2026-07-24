"use client";

import { useState } from "react";
import { CertificateResultCard, type CertificateResult } from "@/components/verify/CertificateResultCard";

export default function VerifyLandingPage() {
  const [certificateNo, setCertificateNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CertificateResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!certificateNo.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await fetch(`/api/verify?certificateNo=${encodeURIComponent(certificateNo.trim())}`);
    setLoading(false);

    if (res.status === 404) {
      setResult({ status: "not-found" });
      return;
    }
    if (!res.ok) {
      setError("Something went wrong while checking that certificate. Please try again.");
      return;
    }
    setResult(await res.json());
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-3xl">📜</p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Verify a Certificate
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Scanned the QR code on your certificate? It takes you straight here. You can also enter
            the Certificate No printed on it below.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950"
        >
          <label htmlFor="certificateNo" className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
            Certificate No
          </label>
          <input
            id="certificateNo"
            required
            placeholder="e.g. NCEVT/2026/004"
            value={certificateNo}
            onChange={(e) => setCertificateNo(e.target.value)}
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-white/10"
          />
          <button
            type="submit"
            disabled={loading || !certificateNo.trim()}
            className="mt-3 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {loading ? "Checking..." : "Verify"}
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>

        {result && (
          <div className="mt-4 rounded-xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <CertificateResultCard result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
