"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SUPER_ADMIN_NAV } from "@/components/dashboard/nav";
import {
  inputClass,
  labelClass,
  cardClass,
  buttonPrimaryClass,
  tableClass,
  thClass,
  tdClass,
} from "@/components/ui/classNames";

type Organization = {
  _id: string;
  name: string;
  email: string;
  certificatePrefix: string;
  qrDomain: string;
  status: string;
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    website: "",
    certificatePrefix: "",
    qrDomain: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/super-admin/organizations");
    const data = await res.json();
    setOrganizations(data.organizations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/super-admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create organization");
      return;
    }
    setForm({ name: "", email: "", address: "", website: "", certificatePrefix: "", qrDomain: "" });
    load();
  }

  return (
    <DashboardShell title="Organizations" nav={SUPER_ADMIN_NAV}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className={cardClass}>
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-50">All Organizations</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : organizations.length === 0 ? (
            <p className="text-sm text-zinc-500">No organizations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Name</th>
                    <th className={thClass}>Email</th>
                    <th className={thClass}>Prefix</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org._id}>
                      <td className={tdClass}>{org.name}</td>
                      <td className={tdClass}>{org.email}</td>
                      <td className={tdClass}>{org.certificatePrefix}</td>
                      <td className={tdClass}>{org.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={cardClass}>
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-50">New Organization</h2>

          <label className={labelClass}>Name</label>
          <input
            required
            className={`${inputClass} mb-3`}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <label className={labelClass}>Email</label>
          <input
            required
            type="email"
            className={`${inputClass} mb-3`}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <label className={labelClass}>Certificate Prefix</label>
          <input
            required
            placeholder="e.g. GDG"
            className={`${inputClass} mb-3`}
            value={form.certificatePrefix}
            onChange={(e) => setForm({ ...form, certificatePrefix: e.target.value })}
          />

          <label className={labelClass}>QR Verify Domain</label>
          <input
            required
            placeholder="https://verify.example.com"
            className={`${inputClass} mb-3`}
            value={form.qrDomain}
            onChange={(e) => setForm({ ...form, qrDomain: e.target.value })}
          />

          <label className={labelClass}>Address</label>
          <input
            className={`${inputClass} mb-3`}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <label className={labelClass}>Website</label>
          <input
            className={`${inputClass} mb-4`}
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className={`${buttonPrimaryClass} w-full`}>
            {submitting ? "Creating..." : "Create Organization"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
