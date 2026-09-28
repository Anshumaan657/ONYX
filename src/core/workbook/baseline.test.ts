import { describe, expect, it } from "vitest";
import { forecastWorkbookBaseline } from "./baseline";

describe("workbook baseline forecast", () => {
  it("projects recent daily values across the next 30 days", () => {
    const report = forecastWorkbookBaseline([
      { date: "2023-08-18", reported: 100, accepted: 90, rejected: 5, reworked: 5, downtimeHours: 2 },
      { date: "2023-08-19", reported: 200, accepted: 180, rejected: 10, reworked: 10, downtimeHours: 4 },
    ], "2023-08-19");
    expect(report.from).toBe("2023-08-20");
    expect(report.through).toBe("2023-09-18");
    expect(report.totals.reported).toBe(4500);
    expect(report.totals.downtimeHours).toBe(90);
    expect(report.confidence).toBe("low");
  });

  it("keeps a missing metric unavailable instead of assuming zero", () => {
    const report = forecastWorkbookBaseline([{ date: "2023-08-18", reported: 100, accepted: null, rejected: null, reworked: null, downtimeHours: null }], "2023-08-18");
    expect(report.totals.reported).toBe(3000);
    expect(report.totals.accepted).toBeNull();
    expect(report.confidence).toBe("low");
  });
});
