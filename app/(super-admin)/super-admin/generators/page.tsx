"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SUPER_ADMIN_NAV } from "@/components/dashboard/nav";
import { cardClass, tableClass, thClass, tdClass, badgeClass } from "@/components/ui/classNames";

type Batch = {
  _id: string;
  batchCode: string;
  organizationId: { name: string } | null;
  generatorId: { name: string; email: string } | null;
  status: string;
  totalRecords: number;
  generatedCount: number;
};

export default function SuperAdminBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/batches")
      .then((res) => res.json())
      .then((data) => {
        setBatches(data.batches ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardShell title="Batches (all organizations)" nav={SUPER_ADMIN_NAV}>
      <div className={cardClass}>
        <p className="mb-4 text-sm text-zinc-500">
          Read-only oversight. Batches are created and assigned by each Organization Admin.
        </p>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : batches.length === 0 ? (
          <p className="text-sm text-zinc-500">No batches yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Batch</th>
                  <th className={thClass}>Organization</th>
                  <th className={thClass}>Generator</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch._id}>
                    <td className={tdClass}>{batch.batchCode}</td>
                    <td className={tdClass}>{batch.organizationId?.name ?? "-"}</td>
                    <td className={tdClass}>{batch.generatorId?.name ?? "Unassigned"}</td>
                    <td className={tdClass}>
                      <span className={badgeClass}>{batch.status.replace("_", " ")}</span>
                    </td>
                    <td className={tdClass}>
                      {batch.generatedCount} / {batch.totalRecords}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
