import { describe, expect, it } from "vitest";
import { emptyMaster } from "../financial/schema";
import { forecastValidated } from "./validated";
import type { CanonicalMmsImport, CanonicalProductionRecord } from "../mms";

function production(date: string, overrides: Partial<CanonicalProductionRecord> = {}): CanonicalProductionRecord {
  return {
    id: `row-${date}`, fingerprint: `fingerprint-${date}`, sourceSheet: "Product Log Book", sourceRow: Number(date.slice(-2)), businessDate: date,
    startAt: `${date}T08:00:00`, endAt: `${date}T16:00:00`, startSortKey: 0, endSortKey: 1, machine: "M1", machineType: "Press", shift: "A",
    issueCodes: [], duplicateOf: null, isValid: true, includedInTotals: true,
    product: { partNumber: "P1", partName: "Widget", partErpCode: "P1", productName: "Widget", erpCode: "P1" }, operator: { raw: "OP1", names: ["OP1"], isMissing: false },
    timesSeconds: { shift: 28_800, allowed: 28_800, operative: 28_800, nonOperative: 0, downtime: 0, systemOff: 0, setup: 0, additionalOvertime: 0, productionGap: 0 },
    cycleTimesSeconds: { standard: null, approved: null, achieved: null }, quantities: { reported: 100, stroke: 100, multiplier: 1, calculatedFromStroke: 100, shiftTarget: 100, operativeTimeTarget: 100, productionLoss: 0, rejected: 0, reworked: 0, errorStroke: 0 },
    costs: { part: null, component: 10, machinePerHour: 20, operatorPerHour: 5, operatorPerHourCandidates: [5] }, scrapPerPart: null, qualityInterlock: "", processDependency: "", proxy: "", toolRequired: "", ...overrides,
  };
}

function source(records: CanonicalProductionRecord[]): CanonicalMmsImport {
  return { source: { company: "Test", fileName: "test.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", byteLength: 1, importedAt: "2026-01-01T00:00:00.000Z", contractVersion: "1" }, productionRecords: records, downtimeRecords: [], dataIssues: [], stats: {} as CanonicalMmsImport["stats"], compatibility: {} as CanonicalMmsImport["compatibility"] };
}

describe("validated segmented forecast", () => {
  it("uses eligible rows, segments the history and reports 30-day totals separately from averages", () => {
    const records = Array.from({ length: 8 }, (_, index) => production(`2026-01-${String(index + 1).padStart(2, "0")}`));
    records.push(production("2026-01-08", { id: "excluded", includedInTotals: false, isValid: false, issueCodes: ["DUPLICATE_RECORD"] }));
    const report = forecastValidated(source(records), emptyMaster(), "2026-01-01", "2026-01-08");

    expect(report.model).toBe("validated-segmented-weighted-v2");
    expect(report.days).toHaveLength(30);
    expect(report.quality?.rowsRead).toBe(9);
    expect(report.quality?.rowsIncluded).toBe(8);
    expect(report.quality?.rowsExcluded).toBe(1);
    expect(report.segmentation?.selectedLevels).toContain("machine_product_shift");
    expect(report.totals.machineCost.status).toBe("available");
    expect(report.dailyAverages?.machineCost.status).toBe("available");
    expect(report.totals.productionValue.status).toBe("unavailable");
    expect(report.confidence).toBe("unavailable");
  });

  it("does not forecast labour from rows with an ambiguous hourly rate", () => {
    const records = Array.from({ length: 8 }, (_, index) => production(`2026-01-${String(index + 1).padStart(2, "0")}`, { costs: { part: null, component: 10, machinePerHour: 20, operatorPerHour: null, operatorPerHourCandidates: [115, 115] }, issueCodes: ["AMBIGUOUS_LABOUR_RATE"] }));
    const report = forecastValidated(source(records), emptyMaster(), "2026-01-01", "2026-01-08");

    expect(report.totals.labourCost.status).toBe("unavailable");
    expect(report.totals.machineCost.status).toBe("available");
    expect(report.assumptions.join(" ")).toMatch(/valid numeric cost inputs/);
  });
});
