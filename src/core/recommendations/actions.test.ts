import { describe, expect, it } from "vitest";
import { exact } from "../policy/exact";
import type { HistoricalFinancialReport, HistoricalMetricKey } from "../historical/types";
import { buildActionPlan } from "./actions";

function report(profit: string | null, readiness: "ready" | "partial" | "unavailable" = "ready"): HistoricalFinancialReport {
  const keys: HistoricalMetricKey[] = ["productionValue", "materialCost", "machineCost", "labourCost", "maintenanceCost", "qualityCost", "allocatedOverhead", "otherDirectCost", "totalOperatingCost", "operatingProfit", "profitMargin"];
  const metric = (key: HistoricalMetricKey) => ({ key, label: key, status: readiness === "unavailable" ? "unavailable" as const : "available" as const, exactValue: key === "operatingProfit" ? (profit ? exact(profit).toJSON() : null) : key === "productionValue" ? exact("150").toJSON() : key === "materialCost" ? exact("80").toJSON() : exact("0").toJSON(), unit: key === "profitMargin" ? "percent" as const : "INR" as const, formula: "test", formulaVersion: "1.0.0" as const, explanation: "test", missing: readiness === "unavailable" ? ["Selling price"] : [], warnings: [], evidenceRefs: [] });
  const totals = Object.fromEntries(keys.map(key => [key, metric(key)])) as unknown as HistoricalFinancialReport["totals"];
  return { schemaVersion: 1, engineVersion: "1.0.0", from: "2026-01-01", through: "2026-01-02", generatedAt: "2026-01-03T00:00:00.000Z", sourceFile: "test.xlsx", masterRevision: 1, days: [], totals, readiness: { status: readiness, usableProductionRows: 1, excludedProductionRows: 0, missing: readiness === "unavailable" ? ["Selling price"] : [], warnings: [] } };
}

describe("financial action plans", () => {
  it("offers a bounded maximize-profit plan with direct evidence", () => {
    const result = buildActionPlan(report("70"));
    expect(result.mode).toBe("maximize_profit");
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0].evidence[0]).toContain("INR");
    expect(result.caveat).toMatch(/not a guaranteed/);
  });
  it("offers a minimize-loss plan without promising a saving", () => {
    const result = buildActionPlan(report("-20"));
    expect(result.mode).toBe("minimize_loss");
    expect(result.headline).toBe("Minimize the loss");
    expect(result.recommendations.some(item => `${item.title} ${item.action}`.toLowerCase().includes("review"))).toBe(true);
  });
  it("withholds recommendations when profit is unavailable", () => {
    const result = buildActionPlan(report(null, "unavailable"));
    expect(result.mode).toBe("review_inputs");
    expect(result.confidence).toBe("unavailable");
    expect(result.recommendations[0].evidence).toContain("Selling price");
  });
});
