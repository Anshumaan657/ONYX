import { describe, expect, it } from "vitest";
import { calculateWorkbookMetrics } from "./metrics";
import type { CanonicalMmsImport } from "@/core/mms";

function source(productionRecords: unknown[], downtimeRecords: unknown[] = [], dataIssues: unknown[] = []): CanonicalMmsImport {
  return { productionRecords, downtimeRecords, dataIssues } as unknown as CanonicalMmsImport;
}
function production(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { includedInTotals: true, sourceSheet: "Product Log Book", sourceRow: 7, businessDate: "2023-08-18", machine: "M1", shift: "A", product: { partNumber: "P1", productName: "Widget" }, operator: { raw: "Op", names: [] }, quantities: { reported: 100, rejected: 5, reworked: 3, errorStroke: 2, productionLoss: 4 }, timesSeconds: { operative: 7200, setup: 3600, systemOff: 1800 }, costs: { component: 10, machinePerHour: 20, operatorPerHour: 5 }, ...overrides };
}

describe("workbook-only metrics", () => {
  it("aggregates production, quality, time and workbook cost fields", () => {
    const report = calculateWorkbookMetrics(source([production()], [{ includedInTotals: true, businessDate: "2023-08-18", durationSeconds: 1800 }]), "2023-08-18", "2023-08-18");
    expect(report.totals.reportedProduction.value).toBe(100);
    expect(report.totals.acceptedProduction.value).toBe(95);
    expect(report.totals.rejectedQuantity.value).toBe(5);
    expect(report.totals.downtimeHours.value).toBe(0.5);
    expect(report.totals.componentCost.value).toBe(1000);
    expect(report.totals.machineCost.value).toBe(40);
    expect(report.totals.labourCost.value).toBe(10);
    expect(report.totals.totalDirectCost.value).toBe(1050);
    expect(report.totals.costPerReportedUnit.value).toBe(10.5);
  });

  it("keeps missing source values partial instead of treating them as zero", () => {
    const report = calculateWorkbookMetrics(source([production({ costs: { component: null, machinePerHour: null, operatorPerHour: null } })]), "2023-08-18", "2023-08-18");
    expect(report.totals.componentCost.status).toBe("unavailable");
    expect(report.totals.machineCost.status).toBe("unavailable");
    expect(report.totals.labourCost.status).toBe("unavailable");
    expect(report.totals.reportedProduction.value).toBe(100);
  });

  it("shows a partial direct-cost-per-unit proxy when only some costs are known", () => {
    const report = calculateWorkbookMetrics(source([production({ costs: { component: 10, machinePerHour: null, operatorPerHour: null } })]), "2023-08-18", "2023-08-18");
    expect(report.totals.costPerReportedUnit.value).toBe(10);
    expect(report.totals.costPerReportedUnit.status).toBe("partial");
  });

  it("does not treat a missing rejection quantity as zero accepted loss", () => {
    const report = calculateWorkbookMetrics(source([production({ quantities: { reported: 100, rejected: null, reworked: 3, errorStroke: 2, productionLoss: 4 } })]), "2023-08-18", "2023-08-18");
    expect(report.totals.acceptedProduction.value).toBeNull();
    expect(report.totals.acceptedProduction.status).toBe("unavailable");
  });

  it("applies product, machine and shift filters", () => {
    const report = calculateWorkbookMetrics(source([production(), production({ sourceRow: 8, machine: "M2", shift: "B" })]), "2023-08-18", "2023-08-18", { machine: "M1", shift: "A" });
    expect(report.sourceRows).toBe(1);
    expect(report.totals.reportedProduction.value).toBe(100);
  });

  it("returns sorted daily points for trend views", () => {
    const report = calculateWorkbookMetrics(source([production({ businessDate: "2023-08-19", sourceRow: 8 }), production({ businessDate: "2023-08-18", sourceRow: 7 })]), "2023-08-18", "2023-08-19");
    expect(report.daily.map(point => point.date)).toEqual(["2023-08-18", "2023-08-19"]);
    expect(report.daily[0].accepted).toBe(95);
  });

  it("keeps strict labour totals separate from ambiguous reconciliation impacts", () => {
    const report = calculateWorkbookMetrics(source([
      production({ costs: { component: 10, machinePerHour: 20, operatorPerHour: 5, operatorPerHourCandidates: [5] } }),
      production({ sourceRow: 8, costs: { component: 10, machinePerHour: 20, operatorPerHour: null, operatorPerHourCandidates: [115, 115] }, issueCodes: ["AMBIGUOUS_LABOUR_RATE"] }),
    ]), "2023-08-18", "2023-08-18");
    expect(report.totals.labourCost.value).toBe(10);
    expect(report.totals.labourCost.status).toBe("partial");
    expect(report.reconciliation?.ambiguousLabourRateRows).toBe(1);
    expect(report.reconciliation?.labourImpacts.firstRate).toBe(240);
    expect(report.reconciliation?.labourImpacts.allRates).toBe(470);
  });
});
