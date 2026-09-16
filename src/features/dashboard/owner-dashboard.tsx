import type { HistoricalFinancialReport } from "@/core/historical";
import { exact } from "@/core/policy/exact";

function message(report: HistoricalFinancialReport): string {
  if (report.readiness.status === "unavailable") return "Complete the missing financial inputs before using this snapshot for a decision.";
  if (report.readiness.status === "partial") return "Some numbers are available, but the snapshot is incomplete. Review the missing inputs before acting.";
  const profit = report.totals.operatingProfit.exactValue;
  return profit && exact(profit).compare(exact("0")) < 0 ? "Operating profit is negative for this period. Open the explanation to see the largest cost pressures." : "Operating profit is positive for this period. Open the explanation to see what to protect and improve.";
}

export function OwnerDashboard({ report }: { report: HistoricalFinancialReport }) {
  return <section className="owner-dashboard" aria-labelledby="owner-dashboard-title">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-(--brand)">Owner snapshot</p><h2 id="owner-dashboard-title" className="mt-2 text-2xl font-bold tracking-tight">The numbers that need your attention</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-(--muted)">{message(report)}</p></div><span className={`readiness ${report.readiness.status}`}>{report.readiness.status === "ready" ? "Ready to decide" : report.readiness.status === "partial" ? "Review inputs" : "Inputs required"}</span></div>
    <p className="setup-help mt-4">{report.from === report.through ? report.from : `${report.from} to ${report.through}`} · {report.readiness.usableProductionRows.toLocaleString("en-IN")} usable production records · Details remain closed until selected.</p>
  </section>;
}
