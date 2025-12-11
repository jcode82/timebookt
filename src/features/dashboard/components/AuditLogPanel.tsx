import type { DashboardData } from "@/features/dashboard/api/getDashboardData";

interface AuditLogPanelProps {
  metrics: DashboardData["metrics"];
}

export function AuditLogPanel({ metrics }: AuditLogPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Recent automation</h2>
      <ul className="mt-4 space-y-3">
        {metrics.recentAuditLog.map((log) => (
          <li key={log.id} className="rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-medium text-slate-900">{log.action}</p>
            <p className="text-xs text-slate-500">
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
        {metrics.recentAuditLog.length === 0 && (
          <li className="text-sm text-slate-500">No audit entries found.</li>
        )}
      </ul>
    </section>
  );
}
