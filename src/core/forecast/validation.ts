import { calculateHistoricalFinancials } from "../historical/engine";
import { HISTORICAL_METRIC_KEYS, type HistoricalMetricKey, type HistoricalFilters } from "../historical/types";
import type { FinancialMaster } from "../financial/schema";
import type { CanonicalMmsImport } from "../mms";
import { exact, type Exact, type ExactValue } from "../policy/exact";
import { forecastHistorical } from "./engine";

export type ForecastValidationMetric = { key: HistoricalMetricKey; label: string; observations: number; mae: ExactValue | null; mape: ExactValue | null; status: "validated" | "insufficient_data" };
export type ForecastValidationReport = { schemaVersion: 1; method: "rolling-30-day-backtest-v1"; evaluationFrom: string; evaluationThrough: string; trainingFrom: string; trainingThrough: string; horizonDays: 30; metrics: Record<HistoricalMetricKey, ForecastValidationMetric>; confidence: "high" | "medium" | "low" | "unavailable"; passed: boolean; explanation: string };

const ZERO = exact("0");
const labels: Record<HistoricalMetricKey, string> = { productionValue: "Estimated Production Value", materialCost: "Material Cost", machineCost: "Machine Cost", labourCost: "Labour Cost", maintenanceCost: "Maintenance Cost", qualityCost: "Quality & Rework Cost", allocatedOverhead: "Allocated Overhead", otherDirectCost: "Packaging & Transport", totalOperatingCost: "Total Operating Cost", operatingProfit: "Estimated Operating Profit", profitMargin: "Profit Margin" };
function shiftDate(date: string, days: number): string { return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10); }
function abs(value: Exact): Exact { return value.compare(ZERO) < 0 ? ZERO.sub(value) : value; }
function emptyMetric(key: HistoricalMetricKey): ForecastValidationMetric { return { key, label: labels[key], observations: 0, mae: null, mape: null, status: "insufficient_data" }; }

export function validateForecast(source: CanonicalMmsImport, master: FinancialMaster, from: string, through: string, filters: HistoricalFilters = {}): ForecastValidationReport {
  const evaluationFrom = shiftDate(through, -29), trainingThrough = shiftDate(evaluationFrom, -1);
  const metrics = Object.fromEntries(HISTORICAL_METRIC_KEYS.map(key => [key, emptyMetric(key)])) as Record<HistoricalMetricKey, ForecastValidationMetric>;
  // A valid back-test needs 30 complete training dates before the 30-day test window.
  if (trainingThrough < shiftDate(from, 29)) return { schemaVersion: 1, method: "rolling-30-day-backtest-v1", evaluationFrom, evaluationThrough: through, trainingFrom: from, trainingThrough, horizonDays: 30, metrics, confidence: "unavailable", passed: false, explanation: "At least 60 calendar days are required: 30 days to learn the pattern and 30 days to test it." };
  const training = calculateHistoricalFinancials(source, master, from, trainingThrough, new Date().toISOString(), filters);
  const actual = calculateHistoricalFinancials(source, master, evaluationFrom, through, new Date().toISOString(), filters);
  const predicted = forecastHistorical(training);
  for (const key of HISTORICAL_METRIC_KEYS) {
    let error = ZERO, percentage = ZERO, observations = 0, percentageObservations = 0;
    for (let index = 0; index < 30; index++) {
      const expected = actual.days[index]?.metrics[key].exactValue, estimate = predicted.days[index]?.metrics[key].exactValue;
      if (!expected || !estimate) continue;
      const expectedValue = exact(expected), difference = abs(exact(estimate).sub(expectedValue));
      error = error.add(difference); observations++;
      if (expectedValue.compare(ZERO) !== 0) { percentage = percentage.add(difference.div(abs(expectedValue)).mul(exact("100"))); percentageObservations++; }
    }
    metrics[key] = { key, label: labels[key], observations, mae: observations ? error.div(exact(String(observations))).toJSON() : null, mape: percentageObservations ? percentage.div(exact(String(percentageObservations))).toJSON() : null, status: observations ? "validated" : "insufficient_data" };
  }
  const usable = Object.values(metrics).filter(metric => metric.status === "validated" && metric.mape).map(metric => exact(metric.mape!));
  const averageMape = usable.length ? usable.reduce((sum, value) => sum.add(value), ZERO).div(exact(String(usable.length))) : null;
  const confidence = !averageMape ? "unavailable" : averageMape.compare(exact("10")) <= 0 ? "high" : averageMape.compare(exact("25")) <= 0 ? "medium" : "low";
  return { schemaVersion: 1, method: "rolling-30-day-backtest-v1", evaluationFrom, evaluationThrough: through, trainingFrom: from, trainingThrough, horizonDays: 30, metrics, confidence, passed: confidence === "high" || confidence === "medium", explanation: averageMape ? `Backtesting compared a 30-day prediction with the following 30 actual days. Average percentage error was ${averageMape.format(1)}%.` : "The selected history did not contain enough complete values to validate the forecast." };
}
