import type { WorkbookMetricsReport } from "./metrics";

export type WorkbookActionPlan = { tone: "profit" | "loss" | "partial" | "neutral"; headline: string; explanation: string; action: string; evidence: string[] };

export function buildWorkbookActionPlan(report: WorkbookMetricsReport): WorkbookActionPlan {
  const { rejectionRate, reworkRate, utilization, targetAchievement } = report.kpis;
  const evidence: string[] = [];
  if (rejectionRate !== null) evidence.push(`Rejection rate is ${rejectionRate.toFixed(1)}%.`);
  if (reworkRate !== null) evidence.push(`Rework rate is ${reworkRate.toFixed(1)}%.`);
  if (utilization !== null) evidence.push(`Utilization is ${utilization.toFixed(1)}%.`);
  if (report.kpis.status === "partial") return { tone: "partial", headline: "Review missing workbook fields", explanation: "The workbook supports a useful operating view, but some KPI inputs are missing.", action: "Fill the missing quantity, time or target fields in the source workbook before making an operational decision.", evidence: [...evidence, ...report.kpis.missing.slice(0, 2)] };
  if (rejectionRate !== null && rejectionRate >= 5) return { tone: "loss", headline: "Quality loss needs attention", explanation: "Rejected quantity is a meaningful share of reported production in the selected workbook data.", action: "Start with the products, machines and shifts showing the highest rejection in the breakdowns, then verify the source cause before changing a process.", evidence };
  if (utilization !== null && utilization < 70) return { tone: "loss", headline: "Capacity is being underused", explanation: "Operative time is below the available recorded time after downtime, setup and system-off periods.", action: "Open the downtime-reason breakdown and address the largest recurring reason first; keep the change targeted and measurable.", evidence };
  if (targetAchievement !== null && targetAchievement >= 100 && (rejectionRate === null || rejectionRate < 5)) return { tone: "profit", headline: "Output is meeting the workbook target", explanation: "Reported production meets the available target while the recorded rejection rate remains contained.", action: "Protect the best-performing machine and shift pattern, then reuse it for comparable products.", evidence };
  return { tone: "neutral", headline: "Keep monitoring the operating pattern", explanation: "The available workbook signals do not show one dominant issue in this selection.", action: "Compare the daily trend and breakdowns regularly so a new quality or downtime change is caught early.", evidence };
}
