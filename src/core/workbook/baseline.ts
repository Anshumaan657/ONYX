import type { WorkbookDailyPoint } from "./metrics";

export type WorkbookBaselineMetric = "reported" | "accepted" | "rejected" | "reworked" | "downtimeHours";
export type WorkbookBaselineForecast = { from: string; through: string; model: "recent-daily-average-v1"; confidence: "high" | "medium" | "low" | "unavailable"; historyDays: number; totals: Record<WorkbookBaselineMetric, number | null>; assumptions: string[] };

function addDays(date: string, amount: number): string { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + amount); return value.toISOString().slice(0, 10); }
function average(points: WorkbookDailyPoint[], key: WorkbookBaselineMetric): number | null { const values = points.map(point => point[key]).filter((value): value is number => value !== null); return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }

export function forecastWorkbookBaseline(points: WorkbookDailyPoint[], through: string): WorkbookBaselineForecast {
  const history = points.slice(-30), from = addDays(through, 1), forecastThrough = addDays(through, 30), historyDays = history.length;
  const confidence = historyDays === 0 ? "unavailable" : historyDays >= 30 ? "high" : historyDays >= 14 ? "medium" : "low";
  const daily = { reported: average(history, "reported"), accepted: average(history, "accepted"), rejected: average(history, "rejected"), reworked: average(history, "reworked"), downtimeHours: average(history, "downtimeHours") };
  const totals = Object.fromEntries(Object.entries(daily).map(([key, value]) => [key, value === null ? null : value * 30])) as Record<WorkbookBaselineMetric, number | null>;
  return { from, through: forecastThrough, model: "recent-daily-average-v1", confidence, historyDays, totals, assumptions: ["The latest available workbook days are repeated as a 30-day baseline.", "No future orders, prices, staffing, shutdowns or cost changes are assumed.", "This is an operational baseline, not a guaranteed prediction or accounting forecast."] };
}
