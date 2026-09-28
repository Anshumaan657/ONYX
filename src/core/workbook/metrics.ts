import type { CanonicalMmsImport, CanonicalProductionRecord, CanonicalDowntimeRecord } from "@/core/mms";
import type { HistoricalFilters } from "@/core/historical";
import { buildWorkbookBreakdowns } from "./breakdowns";

export type WorkbookMetricStatus = "available" | "partial" | "unavailable";
export type WorkbookMetricKey = "reportedProduction" | "acceptedProduction" | "rejectedQuantity" | "reworkedQuantity" | "errorStroke" | "productionLoss" | "operativeHours" | "downtimeHours" | "setupHours" | "systemOffHours" | "componentCost" | "machineCost" | "labourCost" | "costPerReportedUnit";
export type WorkbookMetric = { key: WorkbookMetricKey; label: string; value: number | null; unit: "quantity" | "hours" | "INR"; status: WorkbookMetricStatus; explanation: string; missing: string[] };
export type WorkbookMetricsReport = { from: string; through: string; sourceRows: number; downtimeRows: number; totals: Record<WorkbookMetricKey, WorkbookMetric>; kpis: ReturnType<typeof buildWorkbookBreakdowns>["kpis"]; breakdowns: ReturnType<typeof buildWorkbookBreakdowns>["breakdowns"]; warnings: string[] };

const keys: WorkbookMetricKey[] = ["reportedProduction", "acceptedProduction", "rejectedQuantity", "reworkedQuantity", "errorStroke", "productionLoss", "operativeHours", "downtimeHours", "setupHours", "systemOffHours", "componentCost", "machineCost", "labourCost", "costPerReportedUnit"];
const labels: Record<WorkbookMetricKey, string> = { reportedProduction: "Reported production", acceptedProduction: "Accepted production", rejectedQuantity: "Rejected quantity", reworkedQuantity: "Reworked quantity", errorStroke: "Error stroke", productionLoss: "Production loss", operativeHours: "Operative hours", downtimeHours: "Downtime hours", setupHours: "Setup hours", systemOffHours: "System-off hours", componentCost: "Component cost", machineCost: "Machine cost", labourCost: "Labour cost", costPerReportedUnit: "Cost per reported unit" };
const units: Record<WorkbookMetricKey, WorkbookMetric["unit"]> = { reportedProduction: "quantity", acceptedProduction: "quantity", rejectedQuantity: "quantity", reworkedQuantity: "quantity", errorStroke: "quantity", productionLoss: "quantity", operativeHours: "hours", downtimeHours: "hours", setupHours: "hours", systemOffHours: "hours", componentCost: "INR", machineCost: "INR", labourCost: "INR", costPerReportedUnit: "INR" };
type Totals = Record<WorkbookMetricKey, { value: number; count: number; missing: Set<string> }>;
function blank(): Totals { return Object.fromEntries(keys.map(key => [key, { value: 0, count: 0, missing: new Set<string>() }])) as Totals; }
function number(value: number | null): number | null { return value !== null && Number.isFinite(value) && value >= 0 ? value : null; }
function hours(seconds: number | null): number | null { const value = number(seconds); return value === null ? null : value / 3600; }
function normal(value: string): string { return value.trim().toLocaleLowerCase(); }
function matches(record: CanonicalProductionRecord, filters: HistoricalFilters): boolean { return (!filters.product || normal(record.product.partNumber || record.product.productName) === normal(filters.product)) && (!filters.machine || normal(record.machine) === normal(filters.machine)) && (!filters.shift || normal(record.shift) === normal(filters.shift)); }
function inRange(date: string | null, from: string, through: string): boolean { return Boolean(date && date >= from && date <= through); }
function add(target: Totals, key: WorkbookMetricKey, value: number | null, ref: string): void { if (value === null) target[key].missing.add(`${ref}: value unavailable`); else { target[key].value += value; target[key].count += 1; } }
function metric(key: WorkbookMetricKey, total: Totals[WorkbookMetricKey]): WorkbookMetric {
  const status: WorkbookMetricStatus = total.count === 0 ? "unavailable" : total.missing.size ? "partial" : "available";
  return { key, label: labels[key], value: total.count ? total.value : null, unit: units[key], status, explanation: status === "available" ? "Read directly from eligible MMS workbook records." : status === "partial" ? "A known subtotal is shown; some source rows are missing this field." : "The workbook does not provide enough values for this metric.", missing: [...total.missing].slice(0, 5) };
}
function downtimeHours(source: CanonicalDowntimeRecord[], from: string, through: string): number { return source.filter(row => row.includedInTotals && inRange(row.businessDate, from, through)).reduce((sum, row) => sum + (hours(row.durationSeconds) ?? 0), 0); }

export function calculateWorkbookMetrics(source: CanonicalMmsImport, from: string, through: string, filters: HistoricalFilters = {}): WorkbookMetricsReport {
  const totals = blank();
  const records = source.productionRecords.filter(row => row.includedInTotals && inRange(row.businessDate, from, through) && matches(row, filters));
  for (const row of records) {
    const ref = `${row.sourceSheet} row ${row.sourceRow}`;
    const reported = number(row.quantities.reported), rejected = number(row.quantities.rejected), reworked = number(row.quantities.reworked), error = number(row.quantities.errorStroke), loss = number(row.quantities.productionLoss);
    add(totals, "reportedProduction", reported, ref); add(totals, "rejectedQuantity", rejected, ref); add(totals, "reworkedQuantity", reworked, ref); add(totals, "errorStroke", error, ref); add(totals, "productionLoss", loss, ref);
    add(totals, "acceptedProduction", reported === null ? null : Math.max(0, reported - (rejected ?? 0) - (reworked ?? 0)), ref);
    add(totals, "operativeHours", hours(row.timesSeconds.operative), ref); add(totals, "setupHours", hours(row.timesSeconds.setup), ref); add(totals, "systemOffHours", hours(row.timesSeconds.systemOff), ref);
    add(totals, "componentCost", reported === null || number(row.costs.component) === null ? null : reported * row.costs.component!, ref);
    add(totals, "machineCost", hours(row.timesSeconds.operative) === null || number(row.costs.machinePerHour) === null ? null : hours(row.timesSeconds.operative)! * row.costs.machinePerHour!, ref);
    add(totals, "labourCost", hours(row.timesSeconds.operative) === null || number(row.costs.operatorPerHour) === null ? null : hours(row.timesSeconds.operative)! * row.costs.operatorPerHour!, ref);
  }
  const downtime = downtimeHours(source.downtimeRecords, from, through);
  totals.downtimeHours.value = downtime; totals.downtimeHours.count = source.downtimeRecords.filter(row => row.includedInTotals && inRange(row.businessDate, from, through)).length;
  if (!totals.downtimeHours.count) totals.downtimeHours.missing.add("No valid downtime record covers this range.");
  const cost = ["componentCost", "machineCost", "labourCost"] as const;
  if (totals.reportedProduction.count) { const totalCost = cost.reduce((sum, key) => sum + totals[key].value, 0); const complete = cost.every(key => totals[key].count > 0 && !totals[key].missing.size); totals.costPerReportedUnit.value = totalCost / totals.reportedProduction.value; totals.costPerReportedUnit.count = complete ? 1 : 0; if (!complete) totals.costPerReportedUnit.missing.add("One or more workbook cost fields are incomplete."); }
  const warnings = source.dataIssues.length ? [`${source.dataIssues.length.toLocaleString()} source data findings remain available for review.`] : [];
  const analysis = buildWorkbookBreakdowns(source, from, through, filters);
  return { from, through, sourceRows: records.length, downtimeRows: totals.downtimeHours.count, totals: Object.fromEntries(keys.map(key => [key, metric(key, totals[key])])) as Record<WorkbookMetricKey, WorkbookMetric>, kpis: analysis.kpis, breakdowns: analysis.breakdowns, warnings };
}
