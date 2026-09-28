import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyMaster } from "@/core/financial/schema";
import type { HistoricalFinancialReport, HistoricalMetric, HistoricalMetricKey } from "@/core/historical";
import type { MmsImportSummary } from "@/core/mms";
import { FinancialResults } from "./financial-results";

const keys: HistoricalMetricKey[] = ["productionValue", "materialCost", "machineCost", "labourCost", "maintenanceCost", "qualityCost", "allocatedOverhead", "otherDirectCost", "totalOperatingCost", "operatingProfit", "profitMargin"];
function metric(key: HistoricalMetricKey): HistoricalMetric { return { key, label: key === "operatingProfit" ? "Estimated Operating Profit" : key, status: "available", exactValue: { numerator: "100", denominator: "1" }, unit: key === "profitMargin" ? "percent" : "INR", formula: "Verified formula", formulaVersion: "1.0.0", explanation: "This result uses eligible records and rates for the selected period.", missing: [], warnings: [], evidenceRefs: ["Product Log Book row 7"] }; }
const metrics = Object.fromEntries(keys.map(key => [key, metric(key)])) as HistoricalFinancialReport["totals"];
const report: HistoricalFinancialReport = { schemaVersion: 1, engineVersion: "1.0.0", from: "2026-01-01", through: "2026-01-02", generatedAt: "2026-01-03T00:00:00.000Z", sourceFile: "sample.xlsx", masterRevision: 1, days: [{ date: "2026-01-01", productionRows: 1, metrics }, { date: "2026-01-02", productionRows: 1, metrics }], totals: metrics, readiness: { status: "ready", usableProductionRows: 2, excludedProductionRows: 0, missing: [], warnings: [] } };
const summary = { dateRange: ["2026-01-01", "2026-01-02"], source: { fileName: "sample.xlsx" } } as unknown as MmsImportSummary;

describe("financial results", () => {
  it("analyses automatically while keeping explanations and formulas hidden", async () => {
    const analyze = vi.fn().mockResolvedValue(report);
    render(<FinancialResults source={summary} master={emptyMaster()} client={{ analyze }} onSetup={() => undefined} />);
    expect(screen.queryByText("Why this result?")).not.toBeInTheDocument();
    await waitFor(() => expect(analyze).toHaveBeenCalled());
    expect(screen.getByText("Financial overview")).toBeInTheDocument();
    expect(screen.getByLabelText("Machine")).toBeInTheDocument();
    expect(screen.queryByText("Why this result?")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified formula")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "View details" })[0]);
    expect(screen.getByText("Why this result?")).toBeInTheDocument();
    expect(screen.queryByText("Verified formula")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /daily trend/i })).toBeInTheDocument();
  });
});
