import { describe, expect, it } from "vitest";
import { buildWorkbookActionPlan } from "./actions";
import type { WorkbookMetricsReport } from "./metrics";

const report = (overrides: Partial<WorkbookMetricsReport["kpis"]>): WorkbookMetricsReport => ({ from: "2023-01-01", through: "2023-01-02", sourceRows: 2, downtimeRows: 1, totals: {} as WorkbookMetricsReport["totals"], breakdowns: {} as WorkbookMetricsReport["breakdowns"], daily: [], baselineForecast: { from: "2023-01-03", through: "2023-02-01", model: "recent-daily-average-v1", confidence: "medium", historyDays: 2, totals: { reported: 1, accepted: 1, rejected: 0, reworked: 0, downtimeHours: 1 }, assumptions: [] }, warnings: [], kpis: { rejectionRate: 1, reworkRate: 1, errorStrokeRate: 0, utilization: 80, targetAchievement: 100, status: "available", missing: [], ...overrides } });

describe("workbook action plan", () => {
  it("prioritizes high rejection with a targeted action", () => {
    const plan = buildWorkbookActionPlan(report({ rejectionRate: 8 }));
    expect(plan.tone).toBe("loss");
    expect(plan.action).toMatch(/breakdown/i);
  });
  it("never hides incomplete evidence", () => {
    const plan = buildWorkbookActionPlan(report({ status: "partial", missing: ["target missing"] }));
    expect(plan.tone).toBe("partial");
    expect(plan.evidence.join(" ")).toContain("target missing");
  });
});
