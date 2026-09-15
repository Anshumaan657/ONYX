import type { ExactValue } from "../policy/exact";
import type { HistoricalMetricKey } from "../historical/types";

export type ForecastMetric = { key: HistoricalMetricKey; label: string; exactValue: ExactValue | null; unit: "INR" | "percent"; status: "available" | "unavailable" };
export type ForecastDay = { date: string; metrics: Record<HistoricalMetricKey, ForecastMetric> };
export type ForecastReport = {
  schemaVersion: 1; engineVersion: "1.0.0"; model: "recent-daily-average-v1"; horizonDays: 30;
  from: string; through: string; historicalFrom: string; historicalThrough: string; generatedAt: string; sourceFile: string;
  confidence: "high" | "medium" | "low"; assumptions: string[]; days: ForecastDay[];
  totals: Record<HistoricalMetricKey, ForecastMetric>; readiness: "ready" | "partial" | "unavailable";
};
