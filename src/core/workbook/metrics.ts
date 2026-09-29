import type { CanonicalMmsImport, CanonicalProductionRecord, CanonicalDowntimeRecord } from "@/core/mms";
import type { HistoricalFilters } from "@/core/historical";
import { buildWorkbookBreakdowns } from "./breakdowns";
import { forecastWorkbookBaseline } from "./baseline";

export type WorkbookMetricStatus = "available" | "partial" | "unavailable";
export type WorkbookReconciliationStatus = "Comparable" | "Partial source values" | "Not comparable" | "Missing Excel total" | "Unit mismatch" | "ONYX-calculated";
export type WorkbookReconciliationField = { field: string; status: WorkbookReconciliationStatus; excelTotal: number | null; onyxTotal: number | null; difference: number | null; unit: "quantity" | "hours" | "INR" | "rate" | "text"; reason: string };
export type WorkbookMetricKey = "reportedProduction" | "acceptedProduction" | "rejectedQuantity" | "reworkedQuantity" | "errorStroke" | "productionLoss" | "operativeHours" | "downtimeHours" | "setupHours" | "systemOffHours" | "componentCost" | "machineCost" | "labourCost" | "costPerReportedUnit";
export type WorkbookMetric = { key: WorkbookMetricKey; label: string; value: number | null; unit: "quantity" | "hours" | "INR"; status: WorkbookMetricStatus; explanation: string; missing: string[] };
export type WorkbookDailyPoint = { date: string; reported: number | null; accepted: number | null; rejected: number | null; reworked: number | null; downtimeHours: number | null };
export type WorkbookReconciliation = { rowsRead: number; rowsIncluded: number; rowsExcluded: number; duplicateRowsExcluded: number; invalidRowsExcluded: number; invalidDateDurationRowsExcluded: number; invalidNumericRowsExcluded: number; missingCostRows: { component: number; machine: number; labour: number }; ambiguousLabourRateRows: number; labourImpacts: { strict: number | null; firstRate: number | null; allRates: number | null }; excelTotalRows: NonNullable<CanonicalMmsImport["excelTotalRows"]>; fields: WorkbookReconciliationField[] };
export type WorkbookMetricsReport = { from: string; through: string; sourceRows: number; downtimeRows: number; totals: Record<WorkbookMetricKey, WorkbookMetric>; kpis: ReturnType<typeof buildWorkbookBreakdowns>["kpis"]; breakdowns: ReturnType<typeof buildWorkbookBreakdowns>["breakdowns"]; daily: WorkbookDailyPoint[]; baselineForecast: ReturnType<typeof forecastWorkbookBaseline>; warnings: string[]; reconciliation?: WorkbookReconciliation };

const keys: WorkbookMetricKey[] = ["reportedProduction", "acceptedProduction", "rejectedQuantity", "reworkedQuantity", "errorStroke", "productionLoss", "operativeHours", "downtimeHours", "setupHours", "systemOffHours", "componentCost", "machineCost", "labourCost", "costPerReportedUnit"];
const labels: Record<WorkbookMetricKey, string> = { reportedProduction: "Reported production", acceptedProduction: "Accepted production", rejectedQuantity: "Rejected quantity", reworkedQuantity: "Reworked quantity", errorStroke: "Error stroke", productionLoss: "Production loss", operativeHours: "Operative hours", downtimeHours: "Downtime hours", setupHours: "Setup hours", systemOffHours: "System-off hours", componentCost: "Component cost (material proxy)", machineCost: "Machine cost", labourCost: "Labour cost", costPerReportedUnit: "Cost per reported unit" };
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

const comparableDefinitions: Array<{ field: string; unit: "quantity" | "hours" }> = [
  { field: "Qty", unit: "quantity" }, { field: "Stroke", unit: "quantity" }, { field: "Shift Target", unit: "quantity" },
  { field: "Opr. Time Target", unit: "quantity" }, { field: "Product Loss", unit: "quantity" }, { field: "Reject Qty", unit: "quantity" },
  { field: "Rework Qty", unit: "quantity" }, { field: "Error Stroke", unit: "quantity" }, { field: "Shift Time", unit: "hours" },
  { field: "Allowed Time", unit: "hours" }, { field: "Opr. Time", unit: "hours" }, { field: "Non Opr. Time", unit: "hours" },
  { field: "Down Time", unit: "hours" }, { field: "System Off", unit: "hours" }, { field: "Duration", unit: "hours" },
];
const notComparableDefinitions = [
  ["Running Hrs Cost", "rate", "Hourly machine rate, not an additive total."], ["Operator Per Hrs Cost", "rate", "Hourly labour rate, not an additive total."],
  ["Component Cost", "INR", "Per-unit component cost; ONYX multiplies it by Qty."], ["Part Cost", "INR", "Per-unit part cost, not an additive total."],
  ["Std. Cycle Time", "hours", "Per-cycle time, not an additive total."], ["Achieve Cycle Time", "hours", "Per-cycle time, not an additive total."],
  ["Machine Type", "text", "Categorical field."], ["Product Name", "text", "Categorical field."], ["Operator", "text", "Categorical field."], ["Reason", "text", "Categorical field."],
] as const;

function productionComparableValue(row: CanonicalProductionRecord, field: string): number | null {
  const values: Record<string, number | null> = {
    Qty: row.quantities.reported, Stroke: row.quantities.stroke, "Shift Target": row.quantities.shiftTarget,
    "Opr. Time Target": row.quantities.operativeTimeTarget, "Product Loss": row.quantities.productionLoss,
    "Reject Qty": row.quantities.rejected, "Rework Qty": row.quantities.reworked, "Error Stroke": row.quantities.errorStroke,
    "Shift Time": row.timesSeconds.shift, "Allowed Time": row.timesSeconds.allowed, "Opr. Time": row.timesSeconds.operative,
    "Non Opr. Time": row.timesSeconds.nonOperative, "Down Time": row.timesSeconds.downtime, "System Off": row.timesSeconds.systemOff,
  };
  return values[field] ?? null;
}

function reconciliationFields(records: CanonicalProductionRecord[], downtimeRecords: CanonicalDowntimeRecord[], excelTotalRows: NonNullable<CanonicalMmsImport["excelTotalRows"]>, totals: Totals): WorkbookReconciliationField[] {
  const productionTotals = excelTotalRows.filter(row => row.sheet === "Product Log Book");
  const excelValue = (field: string): number | null => {
    const rows = field === "Duration" ? excelTotalRows.filter(row => row.sheet === "Down Time Details") : productionTotals;
    const values = rows.map(row => row.comparableFields?.[field]).filter((value): value is number => value != null && Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  const fields: WorkbookReconciliationField[] = comparableDefinitions.map(definition => {
    const values = definition.field === "Duration" ? downtimeRecords.map(row => row.durationSeconds) : records.map(row => productionComparableValue(row, definition.field));
    const known = values.filter((value): value is number => value != null && Number.isFinite(value));
    const missing = known.length !== values.length;
    const sourceTotal = known.length ? known.reduce((sum, value) => sum + value, 0) : null;
    const excel = excelValue(definition.field);
    const divisor = definition.unit === "hours" ? 3600 : 1;
    const onyx = sourceTotal === null ? null : sourceTotal / divisor;
    const excelHours = excel === null ? null : excel / divisor;
    const status: WorkbookReconciliationStatus = excelHours === null ? "Missing Excel total" : missing ? "Partial source values" : "Comparable";
    return { field: definition.field, status, excelTotal: excelHours, onyxTotal: onyx, difference: excelHours !== null && onyx !== null ? excelHours - onyx : null, unit: definition.unit, reason: missing ? "Some validated rows do not contain this field." : "Additive field compared after unit normalization." };
  });
  fields.push(...notComparableDefinitions.map(([field, unit, reason]) => ({ field, status: "Not comparable" as const, excelTotal: null, onyxTotal: null, difference: null, unit: unit as WorkbookReconciliationField["unit"], reason })));
  fields.push(
    { field: "Component Cost Amount", status: "ONYX-calculated", excelTotal: null, onyxTotal: totals.componentCost.count ? totals.componentCost.value : null, difference: null, unit: "INR", reason: "Calculated as SUM(Qty × valid Component Cost)." },
    { field: "Machine Cost", status: "ONYX-calculated", excelTotal: null, onyxTotal: totals.machineCost.count ? totals.machineCost.value : null, difference: null, unit: "INR", reason: "Calculated as SUM(Opr. Time hours × valid Running Hrs Cost)." },
    { field: "Labour Cost", status: "ONYX-calculated", excelTotal: null, onyxTotal: totals.labourCost.count ? totals.labourCost.value : null, difference: null, unit: "INR", reason: "Calculated as SUM(Opr. Time hours × valid Operator Per Hrs Cost)." },
  );
  return fields;
}
function downtimeHours(source: CanonicalDowntimeRecord[], from: string, through: string, filters: HistoricalFilters): number { return source.filter(row => row.includedInTotals && inRange(row.businessDate, from, through) && (!filters.machine || normal(row.machine) === normal(filters.machine)) && (!filters.shift || normal(row.shift) === normal(filters.shift))).reduce((sum, row) => sum + (hours(row.durationSeconds) ?? 0), 0); }
function dailyPoints(records: CanonicalProductionRecord[], downtime: CanonicalDowntimeRecord[], filters: HistoricalFilters): WorkbookDailyPoint[] {
  const dates = new Set<string>();
  for (const row of records) if (row.businessDate) dates.add(row.businessDate);
  for (const row of downtime) if (row.businessDate && (!filters.machine || normal(row.machine) === normal(filters.machine))) dates.add(row.businessDate);
  return [...dates].sort().map(date => {
    const rows = records.filter(row => row.businessDate === date), downtimeRows = downtime.filter(row => row.businessDate === date && (!filters.machine || normal(row.machine) === normal(filters.machine)));
    const sum = (field: "reported" | "rejected" | "reworked") => { const values = rows.map(row => number(row.quantities[field === "reported" ? "reported" : field])).filter((value): value is number => value !== null); return values.length === rows.length && rows.length ? values.reduce((total, value) => total + value, 0) : null; };
    const reported = sum("reported"), rejected = sum("rejected"), reworked = sum("reworked");
    return { date, reported, accepted: reported === null ? null : Math.max(0, reported - (rejected ?? 0) - (reworked ?? 0)), rejected, reworked, downtimeHours: downtimeRows.length ? downtimeRows.reduce((total, row) => total + (hours(row.durationSeconds) ?? 0), 0) : null };
  });
}

export function calculateWorkbookMetrics(source: CanonicalMmsImport, from: string, through: string, filters: HistoricalFilters = {}): WorkbookMetricsReport {
  const totals = blank();
  const readRecords = source.productionRecords.filter(row => inRange(row.businessDate, from, through) && matches(row, filters));
  const records = readRecords.filter(row => row.includedInTotals);
  let strictLabour = 0, firstRateLabour = 0, allRatesLabour = 0, strictLabourRows = 0, firstRateRows = 0, allRateRows = 0;
  const missingCostRows = { component: 0, machine: 0, labour: 0 };
  for (const row of records) {
    const ref = `${row.sourceSheet} row ${row.sourceRow}`;
    const reported = number(row.quantities.reported), rejected = number(row.quantities.rejected), reworked = number(row.quantities.reworked), error = number(row.quantities.errorStroke), loss = number(row.quantities.productionLoss);
    add(totals, "reportedProduction", reported, ref); add(totals, "rejectedQuantity", rejected, ref); add(totals, "reworkedQuantity", reworked, ref); add(totals, "errorStroke", error, ref); add(totals, "productionLoss", loss, ref);
    add(totals, "acceptedProduction", reported === null ? null : Math.max(0, reported - (rejected ?? 0) - (reworked ?? 0)), ref);
    add(totals, "operativeHours", hours(row.timesSeconds.operative), ref); add(totals, "setupHours", hours(row.timesSeconds.setup), ref); add(totals, "systemOffHours", hours(row.timesSeconds.systemOff), ref);
    const rowHours = hours(row.timesSeconds.operative);
    if (reported === null || number(row.costs.component) === null) missingCostRows.component += 1;
    if (rowHours === null || number(row.costs.machinePerHour) === null) missingCostRows.machine += 1;
    if (rowHours === null || number(row.costs.operatorPerHour) === null) missingCostRows.labour += 1;
    add(totals, "componentCost", reported === null || number(row.costs.component) === null ? null : reported * row.costs.component!, ref);
    add(totals, "machineCost", rowHours === null || number(row.costs.machinePerHour) === null ? null : rowHours * row.costs.machinePerHour!, ref);
    add(totals, "labourCost", rowHours === null || number(row.costs.operatorPerHour) === null ? null : rowHours * row.costs.operatorPerHour!, ref);
    const candidates = row.costs.operatorPerHourCandidates ?? (row.costs.operatorPerHour === null ? [] : [row.costs.operatorPerHour]);
    if (rowHours !== null && row.costs.operatorPerHour !== null) { strictLabour += rowHours * row.costs.operatorPerHour; strictLabourRows += 1; }
    if (rowHours !== null && candidates.length) { firstRateLabour += rowHours * candidates[0]; firstRateRows += 1; allRatesLabour += rowHours * candidates.reduce((sum, value) => sum + value, 0); allRateRows += 1; }
  }
  const downtime = downtimeHours(source.downtimeRecords, from, through, filters);
  totals.downtimeHours.value = downtime; totals.downtimeHours.count = source.downtimeRecords.filter(row => row.includedInTotals && inRange(row.businessDate, from, through) && (!filters.machine || normal(row.machine) === normal(filters.machine)) && (!filters.shift || normal(row.shift) === normal(filters.shift))).length;
  if (!totals.downtimeHours.count) totals.downtimeHours.missing.add("No valid downtime record covers this range.");
  const cost = ["componentCost", "machineCost", "labourCost"] as const;
  if (totals.reportedProduction.count) { const totalCost = cost.reduce((sum, key) => sum + totals[key].value, 0); const complete = cost.every(key => totals[key].count > 0 && !totals[key].missing.size); totals.costPerReportedUnit.value = totalCost / totals.reportedProduction.value; totals.costPerReportedUnit.count = complete ? 1 : 0; if (!complete) totals.costPerReportedUnit.missing.add("One or more workbook cost fields are incomplete."); }
  const warnings = source.dataIssues.length ? [`${source.dataIssues.length.toLocaleString()} source data findings remain available for review.`] : [];
  const analysis = buildWorkbookBreakdowns(source, from, through, filters);
  const daily = dailyPoints(records, source.downtimeRecords.filter(row => row.includedInTotals && inRange(row.businessDate, from, through)), filters);
  const excluded = readRecords.filter(row => !row.includedInTotals);
  const issueCodes = (code: string) => excluded.filter(row => (row.issueCodes ?? []).includes(code as never)).length;
  const ambiguousLabourRateRows = readRecords.filter(row => (row.issueCodes ?? []).includes("AMBIGUOUS_LABOUR_RATE")).length;
  const reconciliation: WorkbookReconciliation = {
    rowsRead: readRecords.length,
    rowsIncluded: records.length,
    rowsExcluded: excluded.length,
    duplicateRowsExcluded: excluded.filter(row => Boolean(row.duplicateOf)).length,
    invalidRowsExcluded: excluded.filter(row => !row.isValid).length,
    invalidDateDurationRowsExcluded: issueCodes("INVALID_DATE") + issueCodes("INVALID_DURATION") + issueCodes("INVALID_INTERVAL"),
    invalidNumericRowsExcluded: issueCodes("INVALID_NUMBER"),
    missingCostRows,
    ambiguousLabourRateRows,
    labourImpacts: { strict: strictLabourRows ? strictLabour : null, firstRate: firstRateRows ? firstRateLabour : null, allRates: allRateRows ? allRatesLabour : null },
    excelTotalRows: source.excelTotalRows ?? [],
    fields: reconciliationFields(records, source.downtimeRecords.filter(row => row.includedInTotals && inRange(row.businessDate, from, through) && (!filters.machine || normal(row.machine) === normal(filters.machine)) && (!filters.shift || normal(row.shift) === normal(filters.shift))), source.excelTotalRows ?? [], totals),
  };
  return { from, through, sourceRows: records.length, downtimeRows: totals.downtimeHours.count, totals: Object.fromEntries(keys.map(key => [key, metric(key, totals[key])])) as Record<WorkbookMetricKey, WorkbookMetric>, kpis: analysis.kpis, breakdowns: analysis.breakdowns, daily, baselineForecast: forecastWorkbookBaseline(daily, through), warnings, reconciliation };
}
