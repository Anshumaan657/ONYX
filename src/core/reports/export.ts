import type { ForecastReport } from "../forecast";
import type { HistoricalFinancialReport, HistoricalMetricKey } from "../historical";

const keys: HistoricalMetricKey[] = ["productionValue", "materialCost", "machineCost", "labourCost", "maintenanceCost", "qualityCost", "allocatedOverhead", "otherDirectCost", "totalOperatingCost", "operatingProfit", "profitMargin"];
const csvCell = (value: string | number | null): string => { const text = value === null ? "" : String(value); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };
const exactText = (value: { numerator: string; denominator: string } | null): string => value ? `${value.numerator}/${value.denominator}` : "";

export function historicalCsv(report: HistoricalFinancialReport): string {
  const header = ["Date", ...keys.map(key => report.totals[key].label), ...keys.map(key => `${report.totals[key].label} status`)];
  const rows = report.days.map(day => [...[day.date], ...keys.map(key => exactText(day.metrics[key].exactValue)), ...keys.map(key => day.metrics[key].status)]);
  return [header, ...rows].map(row => row.map(csvCell).join(",")).join("\n") + "\n";
}

export function forecastCsv(report: ForecastReport): string {
  const header = ["Date", ...keys.map(key => report.totals[key].label), ...keys.map(key => `${report.totals[key].label} status`)];
  const rows = report.days.map(day => [...[day.date], ...keys.map(key => exactText(day.metrics[key].exactValue)), ...keys.map(key => day.metrics[key].status)]);
  return [header, ...rows].map(row => row.map(csvCell).join(",")).join("\n") + "\n";
}

export function reportJson(report: HistoricalFinancialReport, forecast?: ForecastReport | null): string {
  return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), historical: report, forecast: forecast ?? null }, null, 2);
}
