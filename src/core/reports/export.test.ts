import { describe, expect, it } from "vitest";
import { historicalCsv, reportJson } from "./export";
import type { HistoricalFinancialReport, HistoricalMetricKey } from "../historical";

function report(): HistoricalFinancialReport {
  const keys: HistoricalMetricKey[] = ["productionValue", "materialCost", "machineCost", "labourCost", "maintenanceCost", "qualityCost", "allocatedOverhead", "otherDirectCost", "totalOperatingCost", "operatingProfit", "profitMargin"];
  const totals = Object.fromEntries(keys.map(key => [key, { key, label: key, status: "available" as const, exactValue: { numerator: "10", denominator: "1" }, unit: key === "profitMargin" ? "percent" as const : "INR" as const, formula: "test", formulaVersion: "1.0.0" as const, explanation: "test", missing: [], warnings: [], evidenceRefs: [] }])) as unknown as HistoricalFinancialReport["totals"];
  return { schemaVersion: 1, engineVersion: "1.0.0", from: "2026-01-01", through: "2026-01-01", generatedAt: "2026-01-02T00:00:00.000Z", sourceFile: "sample.xlsx", masterRevision: 1, days: [{ date: "2026-01-01", productionRows: 1, metrics: totals }], totals, readiness: { status: "ready", usableProductionRows: 1, excludedProductionRows: 0, missing: [], warnings: [] } };
}

describe("report exports", () => {
  it("exports daily values and statuses as CSV", () => {
    const csv = historicalCsv(report());
    expect(csv.split("\n")[0]).toMatch(/Date/);
    expect(csv).toMatch(/2026-01-01/);
    expect(csv).toMatch(/available/);
  });
  it("exports a versioned JSON bundle", () => {
    const value = JSON.parse(reportJson(report()));
    expect(value.schemaVersion).toBe(1);
    expect(value.historical.sourceFile).toBe("sample.xlsx");
    expect(value.forecast).toBeNull();
  });
});
