import type { WorkbookMetricsReport } from "./metrics";

export type WorkbookReleaseCheck = { label: string; status: "pass" | "review"; detail: string };
export function buildWorkbookReleaseChecks(report: WorkbookMetricsReport): WorkbookReleaseCheck[] {
  const values = Object.values(report.totals).filter(metric => metric.value !== null).map(metric => metric.value!);
  return [
    { label: "Source rows", status: report.sourceRows > 0 ? "pass" : "review", detail: report.sourceRows > 0 ? `${report.sourceRows.toLocaleString("en-IN")} eligible production records.` : "No eligible production records were found." },
    { label: "Negative values", status: values.every(value => value >= 0) ? "pass" : "review", detail: values.every(value => value >= 0) ? "No negative workbook-only totals were produced." : "Review a negative total before relying on this view." },
    { label: "Missing values", status: report.kpis.status === "available" ? "pass" : "review", detail: report.kpis.status === "available" ? "Required workbook KPI fields are present." : "Some KPI fields remain partial or unavailable." },
    { label: "Baseline assumptions", status: report.baselineForecast.confidence === "unavailable" ? "review" : "pass", detail: report.baselineForecast.confidence === "unavailable" ? "There is not enough history for a baseline." : `${report.baselineForecast.historyDays} historical days support the baseline.` },
  ];
}
