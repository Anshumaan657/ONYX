import { exact, type ExactValue } from "../policy/exact";
import type { HistoricalFinancialReport, HistoricalMetricKey } from "./types";

export type AttributionTone = "loss" | "profit" | "break_even" | "unavailable";

export type AttributionDriver = {
  key: HistoricalMetricKey;
  label: string;
  impact: ExactValue;
  explanation: string;
  action: string;
};

export type LossAttribution = {
  tone: AttributionTone;
  headline: string;
  explanation: string;
  drivers: AttributionDriver[];
  action: string;
  scope: string;
};

const costDrivers: Array<{ key: HistoricalMetricKey; action: string }> = [
  { key: "materialCost", action: "Check material usage, purchase rates and high-cost products." },
  { key: "machineCost", action: "Review machine utilization, run time and the highest-cost machines." },
  { key: "labourCost", action: "Review paid time, overtime and staffing against production output." },
  { key: "maintenanceCost", action: "Investigate maintenance time and recurring machine issues." },
  { key: "qualityCost", action: "Reduce rework and investigate the products with repeated quality loss." },
  { key: "allocatedOverhead", action: "Review fixed expenses and whether the allocation basis reflects activity." },
  { key: "otherDirectCost", action: "Review packaging and transport rates for the selected products." },
];

function period(report: HistoricalFinancialReport): string { return report.from === report.through ? report.from : `${report.from} to ${report.through}`; }

export function buildLossAttribution(report: HistoricalFinancialReport): LossAttribution {
  const profit = report.totals.operatingProfit.exactValue ? exact(report.totals.operatingProfit.exactValue) : null;
  const scope = period(report);
  if (!profit) return { tone: "unavailable", headline: "The result cannot be explained yet", explanation: "Profit is unavailable because a complete production value and operating cost are not available for this period.", drivers: [], action: "Review the missing financial inputs, then calculate the period again.", scope };
  const comparison = profit.compare(exact("0"));
  const tone: AttributionTone = comparison < 0 ? "loss" : comparison > 0 ? "profit" : "break_even";
  const drivers: AttributionDriver[] = [];
  for (const candidate of costDrivers) {
    const metric = report.totals[candidate.key];
    if (!metric.exactValue) continue;
    const impact = exact(metric.exactValue);
    if (impact.compare(exact("0")) <= 0) continue;
    drivers.push({ key: candidate.key, label: metric.label, impact: metric.exactValue, explanation: `${metric.label} added to the period cost and reduced the result available after production value.`, action: candidate.action });
  }
  drivers.sort((a, b) => exact(b.impact).compare(exact(a.impact)));
  const top = drivers.slice(0, 3);
  if (tone === "loss") return { tone, headline: "This period ended in a loss", explanation: top.length ? `The largest cost pressures were ${top.map(item => item.label.toLowerCase()).join(", ")}. These costs were higher than the estimated production value left after all operating costs.` : "The period has a negative operating result, but no complete cost driver is available to rank.", drivers: top, action: top[0]?.action ?? "Review the missing cost details before deciding on an action.", scope };
  if (tone === "profit") return { tone, headline: "This period ended in a profit", explanation: top.length ? `The period stayed profitable after ${top[0].label.toLowerCase()} and the other operating costs were deducted from estimated production value.` : "Estimated production value was higher than the available operating costs.", drivers: top, action: "Protect the profitable products and review the largest cost driver for further improvement.", scope };
  return { tone, headline: "This period broke even", explanation: "Estimated production value and operating costs were equal after the available calculations.", drivers: top, action: "Look for small reductions in the largest cost driver to create a positive margin.", scope };
}
