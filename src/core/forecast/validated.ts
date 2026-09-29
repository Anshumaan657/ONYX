import type { FinancialMaster } from "../financial/schema";
import { calculateHistoricalFinancials } from "../historical/engine";
import type { HistoricalFilters, HistoricalMetricKey, HistoricalFinancialReport } from "../historical/types";
import type { CanonicalDowntimeRecord, CanonicalMmsImport, CanonicalProductionRecord } from "../mms";
import { exact, type Exact } from "../policy/exact";
import type { ForecastDay, ForecastMetric, ForecastReport } from "./types";

type SignalKey = "reportedProduction" | "materialCost" | "machineCost" | "labourCost" | "downtimeHours";
type SegmentLevel = "machine_product_shift" | "machine_product" | "machine" | "product" | "all";
type MetricBucket = { values: Exact[]; rows: number; valid: number };
type SeriesDay = { date: string; buckets: Record<SignalKey, MetricBucket> };
type Series = { key: string; level: SegmentLevel; machine: string; product: string; shift: string; days: Map<string, SeriesDay> };
type Observation = { date: string; value: Exact; weekday: number };

const ZERO = exact("0");
const SIGNAL_KEYS: SignalKey[] = ["reportedProduction", "materialCost", "machineCost", "labourCost", "downtimeHours"];
const DIRECT_TO_HISTORICAL: Partial<Record<SignalKey, HistoricalMetricKey>> = { materialCost: "materialCost", machineCost: "machineCost", labourCost: "labourCost" };
const LEVELS: SegmentLevel[] = ["machine_product_shift", "machine_product", "machine", "product", "all"];
const LABELS: Record<HistoricalMetricKey, string> = {
  productionValue: "Estimated Production Value", materialCost: "Material Cost", machineCost: "Machine Cost", labourCost: "Labour Cost",
  maintenanceCost: "Maintenance Cost", qualityCost: "Quality & Rework Cost", allocatedOverhead: "Allocated Overhead",
  otherDirectCost: "Packaging & Transport", totalOperatingCost: "Total Operating Cost", operatingProfit: "Estimated Operating Profit", profitMargin: "Profit Margin",
};

function normal(value: string | null | undefined): string { return (value ?? "").trim().toLocaleLowerCase(); }
function productName(record: CanonicalProductionRecord): string { return record.product.partNumber || record.product.productName || record.product.partName || record.product.erpCode || "unknown product"; }
function productFromDowntime(record: CanonicalDowntimeRecord): string { return record.productName || "unknown product"; }
function inRange(date: string | null, from: string, through: string): boolean { return Boolean(date && date >= from && date <= through); }
function dateWeekday(date: string): number { return new Date(`${date}T00:00:00Z`).getUTCDay(); }
function addDays(date: string, amount: number): string { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + amount); return value.toISOString().slice(0, 10); }
function futureDates(through: string): string[] { return Array.from({ length: 30 }, (_, index) => addDays(through, index + 1)); }
function emptyBuckets(): Record<SignalKey, MetricBucket> { return Object.fromEntries(SIGNAL_KEYS.map(key => [key, { values: [], rows: 0, valid: 0 }])) as unknown as Record<SignalKey, MetricBucket>; }
function getDay(map: Map<string, SeriesDay>, date: string): SeriesDay { const existing = map.get(date); if (existing) return existing; const created = { date, buckets: emptyBuckets() }; map.set(date, created); return created; }
function exactNumber(value: number | null): Exact | null { return value !== null && Number.isFinite(value) && value >= 0 ? exact(String(value)) : null; }
function exactHours(seconds: number | null): Exact | null { return seconds === null || !Number.isFinite(seconds) || seconds < 0 ? null : exact(String(seconds)).div(exact("3600")); }
function keyFor(level: SegmentLevel, machine: string, product: string, shift: string): string {
  if (level === "machine_product_shift") return `${machine}|${product}|${shift}`;
  if (level === "machine_product") return `${machine}|${product}`;
  if (level === "machine") return machine;
  if (level === "product") return product;
  return "all";
}
function getSeries(series: Map<string, Series>, level: SegmentLevel, machine: string, product: string, shift: string): Series {
  const key = keyFor(level, machine, product, shift), id = `${level}:${key}`, existing = series.get(id);
  if (existing) return existing;
  const created = { key, level, machine, product, shift, days: new Map<string, SeriesDay>() };
  series.set(id, created);
  return created;
}
function matches(record: CanonicalProductionRecord, filters: HistoricalFilters): boolean {
  return (!filters.product || normal(productName(record)) === normal(filters.product)) && (!filters.machine || normal(record.machine) === normal(filters.machine)) && (!filters.shift || normal(record.shift) === normal(filters.shift));
}
function addValue(target: MetricBucket, value: Exact | null): void { target.rows += 1; if (value) { target.valid += 1; target.values.push(value); } }
function valuesFor(record: CanonicalProductionRecord): Record<SignalKey, Exact | null> {
  const reported = exactNumber(record.quantities.reported), hours = exactHours(record.timesSeconds.operative), component = exactNumber(record.costs.component), machineRate = exactNumber(record.costs.machinePerHour), labourRate = exactNumber(record.costs.operatorPerHour);
  return { reportedProduction: reported, materialCost: reported && component ? reported.mul(component) : null, machineCost: hours && machineRate ? hours.mul(machineRate) : null, labourCost: hours && labourRate ? hours.mul(labourRate) : null, downtimeHours: null };
}
function addProductionRecord(series: Map<string, Series>, record: CanonicalProductionRecord): void {
  if (!record.businessDate) return;
  const machine = normal(record.machine) || "unknown machine", product = normal(productName(record)), shift = normal(record.shift) || "unknown shift", values = valuesFor(record);
  for (const level of LEVELS) { const targetDay = getDay(getSeries(series, level, machine, product, shift).days, record.businessDate); for (const key of SIGNAL_KEYS) addValue(targetDay.buckets[key], values[key]); }
}
function addDowntimeRecord(series: Map<string, Series>, record: CanonicalDowntimeRecord): void {
  if (!record.includedInTotals || !record.businessDate || record.durationSeconds === null || record.durationSeconds < 0) return;
  const machine = normal(record.machine) || "unknown machine", product = normal(productFromDowntime(record)), shift = normal(record.shift) || "unknown shift", value = exactHours(record.durationSeconds);
  for (const level of LEVELS) addValue(getDay(getSeries(series, level, machine, product, shift).days, record.businessDate).buckets.downtimeHours, value);
}
function buildSeries(source: CanonicalMmsImport, from: string, through: string, filters: HistoricalFilters): { series: Map<string, Series>; rowsRead: number; rowsIncluded: number; rowsExcluded: number; excludedReasons: string[]; downtimeRows: number; unreportedDowntimeRows: number } {
  const series = new Map<string, Series>(), selected = source.productionRecords.filter(record => inRange(record.businessDate, from, through) && matches(record, filters));
  const included = selected.filter(record => record.includedInTotals && record.isValid && Boolean(record.businessDate));
  for (const record of included) addProductionRecord(series, record);
  const downtime = source.downtimeRecords.filter(record => inRange(record.businessDate, from, through) && (!filters.machine || normal(record.machine) === normal(filters.machine)) && (!filters.shift || normal(record.shift) === normal(filters.shift)));
  for (const record of downtime) addDowntimeRecord(series, record);
  const excludedReasons = [...new Set(selected.filter(record => !record.includedInTotals || !record.isValid || !record.businessDate).flatMap(record => record.issueCodes.map(code => code.replaceAll("_", " ").toLocaleLowerCase())))];
  return { series, rowsRead: selected.length, rowsIncluded: included.length, rowsExcluded: selected.length - included.length, excludedReasons, downtimeRows: downtime.filter(record => record.includedInTotals).length, unreportedDowntimeRows: downtime.filter(record => record.includedInTotals && record.isUnreported).length };
}
function median(values: Exact[]): Exact { const sorted = [...values].sort((left, right) => left.compare(right)); return sorted[Math.floor(sorted.length / 2)]; }
function cleanObservations(source: Series, key: SignalKey): { observations: Observation[]; outliers: string[] } {
  const complete = [...source.days.values()].filter(item => item.buckets[key].values.length > 0 && (key === "downtimeHours" || item.buckets[key].valid === item.buckets[key].rows)).map(item => ({ date: item.date, value: item.buckets[key].values.reduce((sum, value) => sum.add(value), ZERO), weekday: dateWeekday(item.date) }));
  if (complete.length < 4) return { observations: complete, outliers: [] };
  const center = median(complete.map(item => item.value)), spread = median(complete.map(item => item.value.compare(center) < 0 ? center.sub(item.value) : item.value.sub(center))), threshold = center.add(spread.mul(exact("3"))).max(center.mul(exact("3"))).max(exact("1"));
  const outliers = complete.filter(item => item.value.compare(threshold) > 0).map(item => item.date);
  return { observations: complete.filter(item => !outliers.includes(item.date)), outliers };
}
function mean(values: Observation[]): Exact | null { return values.length ? values.reduce((sum, item) => sum.add(item.value), ZERO).div(exact(String(values.length))) : null; }
function weighted(observations: Observation[], targetDate: string): Exact | null {
  if (!observations.length) return null;
  const ordered = [...observations].sort((left, right) => left.date.localeCompare(right.date)), recent = ordered.slice(-7), previous = ordered.slice(Math.max(0, ordered.length - 30), Math.max(0, ordered.length - 7)), weekday = ordered.filter(item => item.weekday === dateWeekday(targetDate) && !recent.includes(item) && !previous.includes(item));
  if (observations.length >= 7 && !weekday.length) return ZERO;
  const parts = [[exact("0.5"), mean(recent)], [exact("0.3"), mean(previous)], [exact("0.2"), mean(weekday)]].filter((part): part is [Exact, Exact] => Boolean(part[1]));
  if (!parts.length) return null;
  const weight = parts.reduce((sum, part) => sum.add(part[0]), ZERO);
  return parts.reduce((sum, part) => sum.add(part[0].mul(part[1])), ZERO).div(weight);
}
function reliable(series: Series, key: SignalKey): { observations: Observation[]; outliers: string[] } { return cleanObservations(series, key); }
function selectLevel(series: Map<string, Series>, key: SignalKey): { level: SegmentLevel; groups: Series[]; fallback: boolean } {
  for (const level of LEVELS) {
    const all = [...series.values()].filter(item => item.level === level), groups = all.filter(item => reliable(item, key).observations.length >= 7);
    if (groups.length && (level === "all" || groups.length === all.length)) return { level, groups, fallback: level !== "machine_product_shift" };
  }
  const all = [...series.values()].find(item => item.level === "all");
  return { level: "all", groups: all ? [all] : [], fallback: true };
}
function signalPrediction(series: Map<string, Series>, key: SignalKey, dates: string[]): { values: Array<Exact | null>; level: SegmentLevel; fallback: boolean; outliers: string[] } {
  const selected = selectLevel(series, key), outliers = [...new Set(selected.groups.flatMap(group => reliable(group, key).outliers))];
  return { level: selected.level, fallback: selected.fallback, outliers, values: dates.map(date => selected.groups.reduce<Exact | null>((sum, group) => { const estimate = weighted(reliable(group, key).observations, date); return estimate === null ? sum : sum ? sum.add(estimate) : estimate; }, null)) };
}
function cleanHistorical(report: HistoricalFinancialReport, key: HistoricalMetricKey): Observation[] { return report.days.filter(day => day.metrics[key].status === "available" && day.metrics[key].exactValue).map(day => ({ date: day.date, value: exact(day.metrics[key].exactValue!), weekday: dateWeekday(day.date) })); }
function historicalPrediction(report: HistoricalFinancialReport, key: HistoricalMetricKey, dates: string[]): Array<Exact | null> { const observations = cleanHistorical(report, key); return dates.map(date => weighted(observations, date)); }
function metric(key: HistoricalMetricKey, value: Exact | null): ForecastMetric { return { key, label: LABELS[key], exactValue: value?.toJSON() ?? null, unit: key === "profitMargin" ? "percent" : "INR", status: value ? "available" : "unavailable" }; }
function total(values: Array<Exact | null>): Exact | null { const complete = values.filter((value): value is Exact => Boolean(value)); return complete.length === values.length && complete.length ? complete.reduce((sum, value) => sum.add(value), ZERO) : null; }
function average(values: Array<Exact | null>): Exact | null { const usable = values.filter((value): value is Exact => Boolean(value)); return usable.length ? usable.reduce((sum, value) => sum.add(value), ZERO).div(exact(String(usable.length))) : null; }

export function forecastValidated(source: CanonicalMmsImport, master: FinancialMaster, from: string, through: string, filters: HistoricalFilters = {}, generatedAt = new Date().toISOString()): ForecastReport {
  const dates = futureDates(through), built = buildSeries(source, from, through, filters), historical = calculateHistoricalFinancials(source, master, from, through, generatedAt, filters), signals = Object.fromEntries(SIGNAL_KEYS.map(key => [key, signalPrediction(built.series, key, dates)])) as Record<SignalKey, { values: Array<Exact | null>; level: SegmentLevel; fallback: boolean; outliers: string[] }>, direct = signals, downtime = signals.downtimeHours;
  const aggregate = Object.fromEntries((Object.keys(LABELS) as HistoricalMetricKey[]).map(key => [key, historicalPrediction(historical, key, dates)])) as Record<HistoricalMetricKey, Array<Exact | null>>;
  for (const [signal, historicalKey] of Object.entries(DIRECT_TO_HISTORICAL) as Array<[SignalKey, HistoricalMetricKey]>) aggregate[historicalKey] = direct[signal].values;
  aggregate.totalOperatingCost = dates.map((_, index) => total([aggregate.materialCost[index], aggregate.machineCost[index], aggregate.labourCost[index], aggregate.maintenanceCost[index], aggregate.qualityCost[index], aggregate.allocatedOverhead[index], aggregate.otherDirectCost[index]]));
  aggregate.operatingProfit = dates.map((_, index) => aggregate.productionValue[index] && aggregate.totalOperatingCost[index] ? aggregate.productionValue[index]!.sub(aggregate.totalOperatingCost[index]!) : null);
  aggregate.profitMargin = dates.map((_, index) => aggregate.productionValue[index] && aggregate.operatingProfit[index] && aggregate.productionValue[index]!.compare(ZERO) !== 0 ? aggregate.operatingProfit[index]!.div(aggregate.productionValue[index]!).mul(exact("100")) : null);
  const days: ForecastDay[] = dates.map((date, index) => ({ date, metrics: Object.fromEntries((Object.keys(LABELS) as HistoricalMetricKey[]).map(key => [key, metric(key, aggregate[key][index])])) as ForecastDay["metrics"] }));
  const totals = Object.fromEntries((Object.keys(LABELS) as HistoricalMetricKey[]).map(key => [key, metric(key, total(aggregate[key]))])) as ForecastReport["totals"];
  const dailyAverages = Object.fromEntries((Object.keys(LABELS) as HistoricalMetricKey[]).map(key => [key, metric(key, average(aggregate[key]))])) as ForecastReport["dailyAverages"];
  const outlierDays = [...new Set(Object.values(direct).flatMap(item => item.outliers))], selectedLevels = [...new Set(Object.values(direct).map(item => item.level))], readiness = totals.operatingProfit.exactValue ? "ready" : Object.values(totals).some(item => item.exactValue) ? "partial" : "unavailable";
  const assumptions = ["Only included, valid production rows and valid numeric cost inputs contribute to segmented signals.", "The latest 7 active days receive 50% weight, the previous 23 active days 30%, and older matching-weekday history 20%.", "Machine + product + shift is preferred; sparse groups fall back to machine + product, machine, product, then the workbook.", "Outlier-heavy dates remain in source history but are excluded from the forecast baseline.", "Forecast totals are the sum of predicted daily values; daily averages are provided separately."];
  if (built.rowsExcluded) assumptions.push(`${built.rowsExcluded.toLocaleString()} production rows were excluded from forecast signals.`);
  if (!historical.totals.productionValue.exactValue) assumptions.push("Production value is unavailable because complete selling-price evidence is not present.");
  const downtimeAverage = average(downtime.values), directValues = dates.map((_, index) => total([direct.materialCost.values[index], direct.machineCost.values[index], direct.labourCost.values[index]]));
  const operational = (signal: { values: Array<Exact | null>; level: SegmentLevel; outliers: string[] }, unit: "quantity" | "INR" | "hours", unreportedShare: number | null = null) => ({ unit, total: total(signal.values)?.toJSON() ?? null, dailyAverage: average(signal.values)?.toJSON() ?? null, days: dates.map((date, index) => ({ date, exactValue: signal.values[index]?.toJSON() ?? null })), level: signal.level, outlierDays: signal.outliers, unreportedShare });
  const directSignal = { values: directValues, level: "mixed" as SegmentLevel, outliers: [...new Set([...direct.materialCost.outliers, ...direct.machineCost.outliers, ...direct.labourCost.outliers])] };
  return { schemaVersion: 1, engineVersion: "2.0.0", model: "validated-segmented-weighted-v2", horizonDays: 30, from: dates[0], through: dates.at(-1)!, historicalFrom: from, historicalThrough: through, generatedAt, sourceFile: source.source.fileName, confidence: "unavailable", assumptions, days, totals, dailyAverages, readiness, quality: { rowsRead: built.rowsRead, rowsIncluded: built.rowsIncluded, rowsExcluded: built.rowsExcluded, excludedReasons: built.excludedReasons, completeForecastDays: days.filter(day => day.metrics.productionValue.exactValue).length, outlierDays: [...new Set([...outlierDays, ...downtime.outliers])], activeHistoryDays: historical.days.filter(day => day.productionRows > 0).length }, segmentation: { levelsTried: LEVELS, selectedLevels: [...new Set([...selectedLevels, downtime.level])], fallbackUsed: Object.values(direct).some(item => item.fallback) || downtime.fallback, minimumHistoryDays: 7 }, downtime: { unit: "hours", total: downtime.values.every(Boolean) ? total(downtime.values)?.toJSON() ?? null : null, dailyAverage: downtimeAverage?.toJSON() ?? null, days: dates.map((date, index) => ({ date, exactValue: downtime.values[index]?.toJSON() ?? null })), level: downtime.level, outlierDays: downtime.outliers, unreportedShare: built.downtimeRows ? built.unreportedDowntimeRows / built.downtimeRows : null }, operations: { reportedProduction: operational(signals.reportedProduction, "quantity"), componentCost: operational(direct.materialCost, "INR"), machineCost: operational(direct.machineCost, "INR"), labourCost: operational(direct.labourCost, "INR"), knownDirectOperatingCost: operational(directSignal, "INR"), downtimeHours: operational(downtime, "hours", built.downtimeRows ? built.unreportedDowntimeRows / built.downtimeRows : null) } };
}
