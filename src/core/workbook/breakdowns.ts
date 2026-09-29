import type { CanonicalDowntimeRecord, CanonicalMmsImport, CanonicalProductionRecord } from "@/core/mms";
import type { HistoricalFilters } from "@/core/historical";

export type WorkbookBreakdownDimension = "machine" | "product" | "shift" | "operator" | "downtimeReason";
export type WorkbookBreakdownGroup = { name: string; records: number; reported: number | null; accepted: number | null; rejected: number | null; reworked: number | null; downtimeHours: number; componentCost: number | null; machineCost: number | null; labourCost: number | null };
export type WorkbookBreakdowns = Record<WorkbookBreakdownDimension, WorkbookBreakdownGroup[]>;
export type WorkbookKpis = { rejectionRate: number | null; reworkRate: number | null; errorStrokeRate: number | null; utilization: number | null; targetAchievement: number | null; status: "available" | "partial" | "unavailable"; missing: string[] };

function key(value: string): string { return value.trim().toLocaleLowerCase(); }
function finite(value: number | null): number | null { return value !== null && Number.isFinite(value) && value >= 0 ? value : null; }
function hours(value: number | null): number { return finite(value) === null ? 0 : finite(value)! / 3600; }
function nameFor(dimension: WorkbookBreakdownDimension, row: CanonicalProductionRecord): string {
  if (dimension === "machine") return row.machine || "Unknown machine";
  if (dimension === "shift") return row.shift || "Unknown shift";
  if (dimension === "operator") return row.operator.raw || "Unknown operator";
  return row.product.productName || row.product.partNumber || "Unknown product";
}
function matches(row: CanonicalProductionRecord, filters: HistoricalFilters): boolean { return (!filters.product || key(row.product.partNumber || row.product.productName) === key(filters.product)) && (!filters.machine || key(row.machine) === key(filters.machine)) && (!filters.shift || key(row.shift) === key(filters.shift)); }
function blank(name: string): WorkbookBreakdownGroup { return { name, records: 0, reported: 0, accepted: 0, rejected: 0, reworked: 0, downtimeHours: 0, componentCost: 0, machineCost: 0, labourCost: 0 }; }
function add(group: WorkbookBreakdownGroup, row: CanonicalProductionRecord): void {
  const reported = finite(row.quantities.reported), rejected = finite(row.quantities.rejected), reworked = finite(row.quantities.reworked), operative = hours(row.timesSeconds.operative);
  group.records += 1;
  if (reported === null) group.reported = null; else if (group.reported !== null) group.reported += reported;
  if (reported === null || rejected === null) group.accepted = null; else if (group.accepted !== null) group.accepted += Math.max(0, reported - rejected);
  if (rejected === null) group.rejected = null; else if (group.rejected !== null) group.rejected += rejected;
  if (reworked === null) group.reworked = null; else if (group.reworked !== null) group.reworked += reworked;
  if (group.componentCost !== null) group.componentCost = reported === null || finite(row.costs.component) === null ? null : group.componentCost + reported * row.costs.component!;
  if (group.machineCost !== null) group.machineCost = finite(row.timesSeconds.operative) === null || finite(row.costs.machinePerHour) === null ? null : group.machineCost + operative * row.costs.machinePerHour!;
  if (group.labourCost !== null) group.labourCost = finite(row.timesSeconds.operative) === null || finite(row.costs.operatorPerHour) === null ? null : group.labourCost + operative * row.costs.operatorPerHour!;
}
function productionGroups(records: CanonicalProductionRecord[], dimension: Exclude<WorkbookBreakdownDimension, "downtimeReason">): WorkbookBreakdownGroup[] {
  const groups = new Map<string, WorkbookBreakdownGroup>();
  for (const row of records) { const name = nameFor(dimension, row), group = groups.get(key(name)) ?? blank(name); add(group, row); groups.set(key(name), group); }
  return [...groups.values()].sort((a, b) => (b.records - a.records) || a.name.localeCompare(b.name)).slice(0, 20);
}
function downtimeGroups(records: CanonicalDowntimeRecord[], filters: HistoricalFilters): WorkbookBreakdownGroup[] {
  const groups = new Map<string, WorkbookBreakdownGroup>();
  for (const row of records) {
    if (!row.includedInTotals || (filters.product && key(row.productName) !== key(filters.product)) || (filters.machine && key(row.machine) !== key(filters.machine)) || (filters.shift && key(row.shift) !== key(filters.shift))) continue;
    const name = row.reason || row.reasonType || "Unknown downtime reason", group = groups.get(key(name)) ?? blank(name);
    group.records += 1; group.downtimeHours += hours(row.durationSeconds); groups.set(key(name), group);
  }
  return [...groups.values()].sort((a, b) => (b.downtimeHours - a.downtimeHours) || a.name.localeCompare(b.name)).slice(0, 20);
}

export function buildWorkbookKpis(records: CanonicalProductionRecord[]): WorkbookKpis {
  let reported = 0, rejected = 0, reworked = 0, errorStroke = 0, targets = 0, targetValue = 0, operative = 0, nonProductive = 0;
  const missing = new Set<string>();
  for (const row of records) {
    const qty = finite(row.quantities.reported);
    if (qty === null) missing.add("Reported quantity is missing for one or more records."); else reported += qty;
    if (finite(row.quantities.rejected) === null) missing.add("Rejected quantity is missing for one or more records."); else rejected += row.quantities.rejected!;
    if (finite(row.quantities.reworked) === null) missing.add("Reworked quantity is missing for one or more records."); else reworked += row.quantities.reworked!;
    if (finite(row.quantities.errorStroke) === null) missing.add("Error-stroke quantity is missing for one or more records."); else errorStroke += row.quantities.errorStroke!;
    if (finite(row.quantities.shiftTarget) === null) missing.add("Shift target is missing for one or more records."); else { targets += 1; targetValue += row.quantities.shiftTarget!; }
    if (finite(row.timesSeconds.operative) === null) missing.add("Operative time is missing for one or more records."); else operative += row.timesSeconds.operative!;
    nonProductive += (row.timesSeconds.downtime ?? 0) + (row.timesSeconds.setup ?? 0) + (row.timesSeconds.systemOff ?? 0);
  }
  const status = records.length === 0 ? "unavailable" : missing.size ? "partial" : "available";
  return { rejectionRate: reported ? rejected / reported * 100 : null, reworkRate: reported ? reworked / reported * 100 : null, errorStrokeRate: reported ? errorStroke / reported * 100 : null, utilization: operative + nonProductive ? operative / (operative + nonProductive) * 100 : null, targetAchievement: targets && targetValue ? reported / targetValue * 100 : null, status, missing: [...missing].slice(0, 6) };
}

export function buildWorkbookBreakdowns(source: CanonicalMmsImport, from: string, through: string, filters: HistoricalFilters = {}): { breakdowns: WorkbookBreakdowns; kpis: WorkbookKpis; records: CanonicalProductionRecord[] } {
  const records = source.productionRecords.filter(row => row.includedInTotals && row.businessDate !== null && row.businessDate >= from && row.businessDate <= through && matches(row, filters));
  return { records, kpis: buildWorkbookKpis(records), breakdowns: { machine: productionGroups(records, "machine"), product: productionGroups(records, "product"), shift: productionGroups(records, "shift"), operator: productionGroups(records, "operator"), downtimeReason: downtimeGroups(source.downtimeRecords.filter(row => row.businessDate !== null && row.businessDate >= from && row.businessDate <= through), filters) } };
}
