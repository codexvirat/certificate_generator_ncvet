"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ORG_ADMIN_NAV } from "@/components/dashboard/nav";
import { cardClass, tableClass, thClass, tdClass } from "@/components/ui/classNames";

type LogEntry = {
  _id: string;
  action: string;
  targetType: string;
  role: string;
  userId: { name: string; email: string } | null;
  createdAt: string;
};

export default function OrgAuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/organization/audit-logs")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardShell title="Audit Logs" nav={ORG_ADMIN_NAV}>
      <div className={cardClass}>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>When</th>
                  <th className={thClass}>Who</th>
                  <th className={thClass}>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className={tdClass}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td className={tdClass}>
                      {log.userId?.name ?? "-"} <span className="text-zinc-400">({log.role})</span>
                    </td>
                    <td className={tdClass}>{log.action}</td>
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
