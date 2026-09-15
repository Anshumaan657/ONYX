import { describe, expect, it } from "vitest";
import { buildLossAttribution } from "./attribution";
import { exact } from "../policy/exact";
import type { HistoricalFinancialReport, HistoricalMetricKey } from "./types";

function report(profit: string | null): HistoricalFinancialReport {
  const keys: HistoricalMetricKey[] = ["productionValue", "materialCost", "machineCost", "labourCost", "maintenanceCost", "qualityCost", "allocatedOverhead", "otherDirectCost", "totalOperatingCost", "operatingProfit", "profitMargin"];
  const metric = (key: HistoricalMetricKey) => ({ key, label: key, status: "available" as const, exactValue: key === "operatingProfit" ? (profit ? exact(profit).toJSON() : null) : key === "materialCost" ? exact("80").toJSON() : exact("0").toJSON(), unit: key === "profitMargin" ? "percent" as const : "INR" as const, formula: "test", formulaVersion: "1.0.0" as const, explanation: "test", missing: [], warnings: [], evidenceRefs: [] });
  const totals = Object.fromEntries(keys.map(key => [key, metric(key)])) as unknown as HistoricalFinancialReport["totals"];
  return { schemaVersion: 1, engineVersion: "1.0.0", from: "2026-01-01", through: "2026-01-02", generatedAt: "2026-01-03T00:00:00.000Z", sourceFile: "test.xlsx", masterRevision: 1, days: [], totals, readiness: { status: "ready", usableProductionRows: 1, excludedProductionRows: 0, missing: [], warnings: [] } };
}

describe("loss attribution", () => {
  it("ranks the largest available cost drivers for a loss", () => {
    const result = buildLossAttribution(report("-20"));
    expect(result.tone).toBe("loss");
    expect(result.drivers[0].key).toBe("materialCost");
    expect(result.explanation.split(".").filter(Boolean).length).toBeLessThanOrEqual(2);
  });
  it("explains profit without exposing a crowded dashboard", () => {
    const result = buildLossAttribution(report("120"));
    expect(result.tone).toBe("profit");
    expect(result.action).toMatch(/profitable|cost/i);
  });
  it("does not invent an explanation when profit is unavailable", () => {
    const result = buildLossAttribution(report(null));
    expect(result.tone).toBe("unavailable");
    expect(result.drivers).toHaveLength(0);
  });
});
