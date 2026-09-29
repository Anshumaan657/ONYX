import type { ExactValue } from "../policy/exact";
import type { HistoricalMetricKey } from "../historical/types";

export type ForecastMetric = { key: HistoricalMetricKey; label: string; exactValue: ExactValue | null; unit: "INR" | "percent"; status: "available" | "unavailable" };
export type ForecastDay = { date: string; metrics: Record<HistoricalMetricKey, ForecastMetric> };
export type ForecastQuality = { rowsRead: number; rowsIncluded: number; rowsExcluded: number; excludedReasons: string[]; completeForecastDays: number; outlierDays: string[]; activeHistoryDays: number };
export type ForecastSegmentation = { levelsTried: string[]; selectedLevels: string[]; fallbackUsed: boolean; minimumHistoryDays: number };
export type ForecastOperationalMetric = { unit: "quantity" | "INR" | "hours"; total: ExactValue | null; dailyAverage: ExactValue | null; days: Array<{ date: string; exactValue: ExactValue | null }>; level: string; outlierDays: string[]; unreportedShare: number | null };
export type ForecastOperationalSignals = { reportedProduction: ForecastOperationalMetric; componentCost: ForecastOperationalMetric; machineCost: ForecastOperationalMetric; labourCost: ForecastOperationalMetric; knownDirectOperatingCost: ForecastOperationalMetric; downtimeHours: ForecastOperationalMetric };
export type ForecastBacktest = { method: string; confidence: "high" | "medium" | "low" | "unavailable"; passed: boolean; trainingFrom: string; trainingThrough: string; evaluationFrom: string; evaluationThrough: string; explanation: string };
export type ForecastReport = {
  schemaVersion: 1; engineVersion: "1.0.0" | "2.0.0"; model: "recent-daily-average-v1" | "validated-segmented-weighted-v2"; horizonDays: 30;
  from: string; through: string; historicalFrom: string; historicalThrough: string; generatedAt: string; sourceFile: string;
  confidence: "high" | "medium" | "low" | "unavailable"; assumptions: string[]; days: ForecastDay[];
  totals: Record<HistoricalMetricKey, ForecastMetric>; readiness: "ready" | "partial" | "unavailable";
  dailyAverages?: Record<HistoricalMetricKey, ForecastMetric>; quality?: ForecastQuality; segmentation?: ForecastSegmentation; downtime?: ForecastOperationalMetric; operations?: ForecastOperationalSignals; backtest?: ForecastBacktest;
};
