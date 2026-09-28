import { describe, expect, it } from "vitest";
import { buildWorkbookReleaseChecks } from "./release-checks";
import type { WorkbookMetricsReport } from "./metrics";

describe("workbook release checks", () => {
  it("flags missing baseline history for review", () => {
    const report = { sourceRows: 1, kpis: { status: "partial" }, baselineForecast: { confidence: "unavailable", historyDays: 0 }, totals: {} } as unknown as WorkbookMetricsReport;
    const checks = buildWorkbookReleaseChecks(report);
    expect(checks.find(check => check.label === "Baseline assumptions")?.status).toBe("review");
  });
});
