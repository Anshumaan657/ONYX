import { describe, expect, it } from "vitest";
import { exact } from "../policy/exact";
import { forecastHistorical } from "./engine";
import type { HistoricalFinancialReport, HistoricalMetricKey } from "../historical/types";

function report(): HistoricalFinancialReport {
  const keys: HistoricalMetricKey[] = ["productionValue", "materialCost", "machineCost", "labourCost", "maintenanceCost", "qualityCost", "allocatedOverhead", "otherDirectCost", "totalOperatingCost", "operatingProfit", "profitMargin"];
  const metric = (key: HistoricalMetricKey) => ({ key, label: key, status: "available" as const, exactValue: exact(key === "productionValue" ? "100" : key === "totalOperatingCost" ? "60" : "0").toJSON(), unit: key === "profitMargin" ? "percent" as const : "INR" as const, formula: "test", formulaVersion: "1.0.0" as const, explanation: "test", missing: [], warnings: [], evidenceRefs: [] });
  const totals = Object.fromEntries(keys.map(key => [key, metric(key)])) as unknown as HistoricalFinancialReport["totals"];
  const days = ["2026-01-01", "2026-01-02"].map(date => ({ date, productionRows: 1, metrics: totals }));
  return { schemaVersion: 1, engineVersion: "1.0.0", from: "2026-01-01", through: "2026-01-02", generatedAt: "2026-01-03T00:00:00.000Z", sourceFile: "test.xlsx", masterRevision: 1, days, totals, readiness: { status: "ready", usableProductionRows: 2, excludedProductionRows: 0, missing: [], warnings: [] } };
}

describe("30-day forecast baseline", () => {
  it("creates exactly 30 future days and derives profit", () => {
    const result = forecastHistorical(report(), "2026-01-03T00:00:00.000Z");
    expect(result.days).toHaveLength(30);
    expect(result.from).toBe("2026-01-03");
    expect(result.through).toBe("2026-02-01");
    expect(result.totals.operatingProfit.exactValue).toEqual(exact("40").toJSON());
    expect(result.readiness).toBe("ready");
  });
  it("keeps profit unavailable when production value is missing", () => {
    const input = report(); input.totals.productionValue.exactValue = null;
    const result = forecastHistorical(input);
    expect(result.totals.productionValue.status).toBe("unavailable");
    expect(result.totals.operatingProfit.status).toBe("unavailable");
    expect(result.readiness).toBe("partial");
    expect(result.assumptions.join(" ")).toMatch(/missing|incomplete/i);
  });
});
