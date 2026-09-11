import type { FinancialMaster } from "../financial/schema";
import type { ExactValue } from "../policy/exact";

export const HISTORICAL_METRIC_KEYS = [
  "productionValue",
  "materialCost",
  "machineCost",
  "labourCost",
  "maintenanceCost",
  "qualityCost",
  "allocatedOverhead",
  "otherDirectCost",
  "totalOperatingCost",
  "operatingProfit",
  "profitMargin",
] as const;

export type HistoricalMetricKey = (typeof HISTORICAL_METRIC_KEYS)[number];
export type MetricStatus = "available" | "partial" | "unavailable";

export type HistoricalMetric = {
  key: HistoricalMetricKey;
  label: string;
  status: MetricStatus;
  exactValue: ExactValue | null;
  unit: "INR" | "percent";
  formula: string;
  formulaVersion: "1.0.0";
  explanation: string;
  missing: string[];
  warnings: string[];
  evidenceRefs: string[];
};

export type HistoricalDayResult = {
  date: string;
  productionRows: number;
  metrics: Record<HistoricalMetricKey, HistoricalMetric>;
};

export type HistoricalFinancialReport = {
  schemaVersion: 1;
  engineVersion: "1.0.0";
  from: string;
  through: string;
  generatedAt: string;
  sourceFile: string;
  masterRevision: number;
  days: HistoricalDayResult[];
  totals: Record<HistoricalMetricKey, HistoricalMetric>;
  readiness: {
    status: "ready" | "partial" | "unavailable";
    usableProductionRows: number;
    excludedProductionRows: number;
    missing: string[];
    warnings: string[];
  };
};

export type HistoricalAnalysisRequest = {
  master: FinancialMaster;
  from: string;
  through: string;
};

export type HistoricalAnalysisClient = {
  analyze: (request: HistoricalAnalysisRequest) => Promise<HistoricalFinancialReport>;
};

export type HistoricalWorkerRequest = {
  type: "analyze";
  requestId: string;
  request: HistoricalAnalysisRequest;
};

export type HistoricalWorkerResponse =
  | { type: "analysis_success"; requestId: string; report: HistoricalFinancialReport }
  | { type: "analysis_failure"; requestId: string; message: string };
