import { exact, type ExactValue } from "../policy/exact";
import { buildLossAttribution, type AttributionTone } from "../historical/attribution";
import type { HistoricalFinancialReport, HistoricalMetricKey } from "../historical/types";

export type RecommendationConfidence = "high" | "medium" | "low" | "unavailable";
export type RecommendationMode = "maximize_profit" | "minimize_loss" | "review_inputs";

export type FinancialRecommendation = {
  id: string;
  title: string;
  action: string;
  reason: string;
  evidence: string[];
  sourceMetric: HistoricalMetricKey | null;
  impact: ExactValue | null;
};

export type ActionPlan = {
  mode: RecommendationMode;
  tone: AttributionTone;
  status: "ready" | "partial" | "unavailable";
  confidence: RecommendationConfidence;
  headline: string;
  summary: string;
  recommendations: FinancialRecommendation[];
  scope: string;
  caveat: string;
};

function scope(report: HistoricalFinancialReport): string { return report.from === report.through ? report.from : `${report.from} to ${report.through}`; }

function evidence(label: string, value: ExactValue): string { return `${label}: ${exact(value).format(2)} INR`; }

export function buildActionPlan(report: HistoricalFinancialReport): ActionPlan {
  const attribution = buildLossAttribution(report);
  const period = scope(report);
  const caveat = "This is an evidence-based operating action, not a guaranteed saving or accounting conclusion.";
  if (attribution.tone === "unavailable") {
    return {
      mode: "review_inputs",
      tone: attribution.tone,
      status: "unavailable",
      confidence: "unavailable",
      headline: "Review the missing inputs first",
      summary: attribution.explanation,
      recommendations: [{ id: "review-missing-inputs", title: "Complete the affected financial inputs", action: attribution.action, reason: "The available workbook data cannot support a complete profit or loss action yet.", evidence: report.readiness.missing.slice(0, 5), sourceMetric: null, impact: null }],
      scope: period,
      caveat,
    };
  }

  const top = attribution.drivers[0];
  const production = report.totals.productionValue.exactValue;
  const recommendations: FinancialRecommendation[] = [];
  if (top) recommendations.push({ id: `control-${top.key}`, title: `Control ${top.label.toLowerCase()}`, action: top.action, reason: `It is the largest available operating-cost driver for this period.`, evidence: [evidence(top.label, top.impact)], sourceMetric: top.key, impact: top.impact });
  if (attribution.tone === "profit") {
    recommendations.push({ id: "protect-production-value", title: "Protect the profitable output", action: "Keep the products, machines and shifts that produced this value stable while reviewing the largest cost driver.", reason: "The period remained profitable after the available operating costs were deducted.", evidence: production ? [evidence("Estimated production value", production)] : [], sourceMetric: "productionValue", impact: production });
  } else if (attribution.tone === "loss") {
    recommendations.push({ id: "review-loss-boundary", title: "Review the loss boundary", action: "Compare the selected production value with the largest cost driver before changing prices, staffing or schedules.", reason: "The period ended below zero, so the next decision should be based on the available value and cost evidence.", evidence: production ? [evidence("Estimated production value", production)] : [], sourceMetric: "productionValue", impact: production });
  } else {
    recommendations.push({ id: "create-buffer", title: "Create a small operating buffer", action: "Start with the largest cost driver and look for a controlled reduction without reducing confirmed production value.", reason: "The period broke even, so small changes can move the result in either direction.", evidence: top ? [evidence(top.label, top.impact)] : [], sourceMetric: top?.key ?? null, impact: top?.impact ?? null });
  }
  return { mode: attribution.tone === "loss" ? "minimize_loss" : "maximize_profit", tone: attribution.tone, status: report.readiness.status, confidence: report.readiness.status === "ready" ? "medium" : "low", headline: attribution.tone === "loss" ? "Minimize the loss" : attribution.tone === "profit" ? "Maximize the profit" : "Move beyond break-even", summary: attribution.explanation, recommendations: recommendations.slice(0, 3), scope: period, caveat };
}
