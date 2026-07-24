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

type Organization = { _id: string; name: string };
type Generator = {
  _id: string;
  name: string;
  email: string;
  status: string;
  organizationId: { name: string } | null;
};

export default function SuperAdminGeneratorsPage() {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", organizationId: "" });

  async function load() {
    setLoading(true);
    const [generatorsRes, orgsRes] = await Promise.all([
      fetch("/api/organization/generators"),
      fetch("/api/super-admin/organizations"),
    ]);
    const generatorsData = await generatorsRes.json();
    const orgsData = await orgsRes.json();
    setGenerators(generatorsData.generators ?? []);
    setOrganizations(orgsData.organizations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/organization/generators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create generator");
      return;
    }
    setForm({ name: "", email: "", password: "", organizationId: form.organizationId });
    load();
  }

  return (
    <DashboardShell title="Generator Admins (all organizations)" nav={SUPER_ADMIN_NAV}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className={cardClass}>
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-50">All Generator Admins</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Generator Admins can only upload candidate photos and generate certificates for the
            batches an Organization Admin (or Super Admin) assigns them.
          </p>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : generators.length === 0 ? (
            <p className="text-sm text-zinc-500">No generator admins yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Name</th>
                    <th className={thClass}>Email</th>
                    <th className={thClass}>Organization</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {generators.map((gen) => (
                    <tr key={gen._id}>
                      <td className={tdClass}>{gen.name}</td>
                      <td className={tdClass}>{gen.email}</td>
                      <td className={tdClass}>{gen.organizationId?.name ?? "-"}</td>
                      <td className={tdClass}>{gen.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={cardClass}>
          <h2 className="mb-4 font-medium text-zinc-900 dark:text-zinc-50">New Generator Admin</h2>

          <label className={labelClass}>Organization</label>
          <select
            required
            className={`${inputClass} mb-3`}
            value={form.organizationId}
            onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
          >
            <option value="">Select organization</option>
            {organizations.map((org) => (
              <option key={org._id} value={org._id}>
                {org.name}
              </option>
            ))}
          </select>

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

          <label className={labelClass}>Password</label>
          <input
            required
            type="password"
            className={`${inputClass} mb-4`}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className={`${buttonPrimaryClass} w-full`}>
            {submitting ? "Creating..." : "Create Generator Admin"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
