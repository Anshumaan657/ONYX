import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { exact } from "@/core/policy/exact";
import type { HistoricalFinancialReport, HistoricalMetricKey } from "@/core/historical";
import { OwnerDashboard } from "./owner-dashboard";

function report(status: "ready" | "partial" | "unavailable"): HistoricalFinancialReport {
  const keys: HistoricalMetricKey[] = ["productionValue", "materialCost", "machineCost", "labourCost", "maintenanceCost", "qualityCost", "allocatedOverhead", "otherDirectCost", "totalOperatingCost", "operatingProfit", "profitMargin"];
  const totals = Object.fromEntries(keys.map(key => [key, { key, label: key, status: status === "unavailable" ? "unavailable" : "available", exactValue: status === "unavailable" ? null : exact(key === "operatingProfit" ? "10" : "100").toJSON(), unit: key === "profitMargin" ? "percent" : "INR", formula: "test", formulaVersion: "1.0.0", explanation: "test", missing: [], warnings: [], evidenceRefs: [] }])) as unknown as HistoricalFinancialReport["totals"];
  return { schemaVersion: 1, engineVersion: "1.0.0", from: "2026-01-01", through: "2026-01-02", generatedAt: "2026-01-03T00:00:00.000Z", sourceFile: "test.xlsx", masterRevision: 1, days: [], totals, readiness: { status, usableProductionRows: 2, excludedProductionRows: 0, missing: [], warnings: [] } };
}

describe("owner dashboard", () => {
  it("surfaces a calm decision snapshot and readiness", () => {
    render(<OwnerDashboard report={report("ready")} />);
    expect(screen.getByRole("heading", { name: /numbers that need your attention/i })).toBeInTheDocument();
    expect(screen.getByText("Ready to decide")).toBeInTheDocument();
    expect(screen.getByText(/Details remain closed/)).toBeInTheDocument();
  });
});
