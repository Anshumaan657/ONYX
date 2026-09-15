import { exact, type Exact } from "../policy/exact";
import { HISTORICAL_METRIC_KEYS, type HistoricalFinancialReport, type HistoricalMetricKey } from "../historical/types";
import type { ForecastDay, ForecastMetric, ForecastReport } from "./types";

const labels: Record<HistoricalMetricKey, string> = { productionValue: "Estimated Production Value", materialCost: "Material Cost", machineCost: "Machine Cost", labourCost: "Labour Cost", maintenanceCost: "Maintenance Cost", qualityCost: "Quality & Rework Cost", allocatedOverhead: "Allocated Overhead", otherDirectCost: "Packaging & Transport", totalOperatingCost: "Total Operating Cost", operatingProfit: "Estimated Operating Profit", profitMargin: "Profit Margin" };
const ZERO = exact("0");
function futureDates(lastDate: string): string[] { const start = Date.parse(`${lastDate}T00:00:00Z`) + 86_400_000; return Array.from({ length: 30 }, (_, index) => new Date(start + index * 86_400_000).toISOString().slice(0, 10)); }
function average(report: HistoricalFinancialReport, key: HistoricalMetricKey): Exact | null { const values = report.days.slice(-30).map(day => day.metrics[key].exactValue).filter(Boolean).map(value => exact(value!)); return values.length ? values.reduce((sum, value) => sum.add(value), ZERO).div(exact(String(values.length))) : null; }
function metric(key: HistoricalMetricKey, value: Exact | null): ForecastMetric { return { key, label: labels[key], exactValue: value?.toJSON() ?? null, unit: key === "profitMargin" ? "percent" : "INR", status: value ? "available" : "unavailable" }; }
export function forecastHistorical(report: HistoricalFinancialReport, generatedAt = new Date().toISOString()): ForecastReport {
  const averages = Object.fromEntries(HISTORICAL_METRIC_KEYS.map(key => [key, average(report, key)])) as Record<HistoricalMetricKey, Exact | null>;
  const production = averages.productionValue, cost = averages.totalOperatingCost;
  averages.operatingProfit = production && cost ? production.sub(cost) : null;
  averages.profitMargin = averages.operatingProfit && production && production.compare(ZERO) !== 0 ? averages.operatingProfit.div(production).mul(exact("100")) : null;
  const days: ForecastDay[] = futureDates(report.through).map(date => ({ date, metrics: Object.fromEntries(HISTORICAL_METRIC_KEYS.map(key => [key, metric(key, averages[key])])) as ForecastDay["metrics"] }));
  const observations = report.days.slice(-30).filter(day => day.productionRows > 0).length;
  const confidence: ForecastReport["confidence"] = report.readiness.status === "ready" && observations >= 20 ? "high" : observations >= 7 ? "medium" : "low";
  const assumptions = ["Recent daily averages continue for the next 30 days.", "No future price, cost, staffing, demand or shutdown changes were supplied.", "The forecast uses the last 30 historical days and does not invent missing values."];
  if (report.readiness.status !== "ready") assumptions.push("Historical financial inputs are incomplete; affected forecast metrics remain unavailable.");
  return { schemaVersion: 1, engineVersion: "1.0.0", model: "recent-daily-average-v1", horizonDays: 30, from: days[0].date, through: days.at(-1)!.date, historicalFrom: report.from, historicalThrough: report.through, generatedAt, sourceFile: report.sourceFile, confidence, assumptions, days, totals: Object.fromEntries(HISTORICAL_METRIC_KEYS.map(key => [key, metric(key, averages[key])])) as ForecastReport["totals"], readiness: averages.operatingProfit ? "ready" : Object.values(averages).some(Boolean) ? "partial" : "unavailable" };
}
