import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emptyMaster, newRow, type FinancialMaster, type MasterRow, type SectionKey } from "../financial/schema";
import { parseMmsWorkbookFile, type CanonicalMmsImport, type CanonicalProductionRecord } from "../mms";
import { exact } from "../policy/exact";
import { calculateHistoricalFinancials, formatExact } from "./engine";

function add(master: FinancialMaster, section: SectionKey, values: Record<string, string>): MasterRow {
  const row = newRow(section);
  row.values = { ...row.values, effectiveFrom: "2026-01-01", status: "confirmed", approvedBy: "Reviewer", note: "Synthetic test", ...values };
  master.sections[section].push(row); return row;
}
function master(): FinancialMaster {
  const value = emptyMaster(); value.factory = "Test factory"; value.scope = { from: "2026-01-01", to: "2026-01-31" };
  add(value, "products", { productId: "P1", name: "Part", sourceUnit: "piece", unit: "piece", sellingPrice: "10", materialCost: "4", packagingCost: "1", transportCost: "1", discountPercent: "0" });
  add(value, "machines", { machineId: "M1", name: "Machine", rateMode: "itemized", baseRate: "5", electricity: "2", maintenance: "1", tooling: "1" });
  add(value, "labour", { groupId: "Asha", basis: "operator_shift", rate: "20", paidHours: "8" });
  add(value, "quality", { productId: "P1", rejectionCost: "4", reworkCost: "3", scrapRecovery: "1", rejectionStage: "finished" });
  add(value, "overheads", { name: "Rent", amount: "30", period: "day", allocation: "machine" });
  return value;
}
function record(overrides: Partial<CanonicalProductionRecord> = {}): CanonicalProductionRecord {
  return {
    id: "production-1", fingerprint: "source-1", sourceSheet: "Product Log Book", sourceRow: 7, businessDate: "2026-01-02", startAt: "2026-01-02T08:00:00", endAt: "2026-01-02T09:00:00", startSortKey: 0, endSortKey: 3600, machine: "M1", shift: "Shift 1", issueCodes: [], duplicateOf: null, isValid: true, includedInTotals: true,
    machineType: "Press", product: { partNumber: "P1", partName: "Part", partErpCode: "", productName: "Part", erpCode: "" }, operator: { raw: "Asha", names: ["Asha"], isMissing: false },
    timesSeconds: { shift: 28800, allowed: 28800, operative: 3600, nonOperative: 0, downtime: 0, systemOff: 0, setup: 0, additionalOvertime: 0, productionGap: 0 },
    cycleTimesSeconds: { standard: 36, approved: 36, achieved: 36 }, quantities: { reported: 100, stroke: 100, multiplier: 1, calculatedFromStroke: 100, shiftTarget: 100, operativeTimeTarget: 100, productionLoss: 0, rejected: 2, reworked: 1, errorStroke: 0 },
    costs: { part: null, component: null, machinePerHour: null, operatorPerHour: null }, scrapPerPart: null, qualityInterlock: "", processDependency: "", proxy: "", toolRequired: "", ...overrides,
  };
}
function source(rows = [record()]): CanonicalMmsImport {
  return { source: { company: "Test factory", fileName: "test.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", byteLength: 1, importedAt: "2026-01-03T00:00:00.000Z", contractVersion: "test" }, compatibility: { contractVersion: "test", status: "compatible", generatedAt: "2026-01-03T00:00:00.000Z", file: { name: "test.xlsx Subs", format: "xlsx", mimeType: "", byteLength: 1, signatureVerified: true, originalFilePreserved: true }, workbook: { sheetCount: 2, estimatedRowsAcrossRequiredSheets: 1, formulaCellCount: 0, formulaCellsWithoutCachedValue: 0 }, sheets: [], issues: [] }, productionRecords: rows, downtimeRecords: [], dataIssues: [], stats: { productionRowsRead: rows.length, downtimeRowsRead: 0, productionTotalRowsExcluded: 0, downtimeTotalRowsExcluded: 0, duplicateRecordsExcluded: 0, invalidRecordsExcluded: 0, negativeRecordsAwaitingClassification: 0, errorCount: 0, warningCount: 0, invalidCoreRowRate: 0 } };
}

describe("historical revenue and cost engine", () => {
  it("calculates a complete result without intermediate rounding", () => {
    const report = calculateHistoricalFinancials(source(), master(), "2026-01-02", "2026-01-02", "2026-01-03T00:00:00.000Z");
    expect(formatExact(report.totals.productionValue.exactValue, "INR")).toBe("₹970.00");
    expect(formatExact(report.totals.totalOperatingCost.exactValue, "INR")).toBe("₹656.00");
    expect(formatExact(report.totals.operatingProfit.exactValue, "INR")).toBe("₹314.00");
    expect(report.totals.profitMargin.exactValue).toEqual(exact("314").div(exact("970")).mul(exact("100")).toJSON());
    expect(report.readiness.status).toBe("ready");
  });

  it("shows a known subtotal but keeps profit unavailable when prices or costs are missing", () => {
    const financial = master(); financial.sections.products[0].values.sellingPrice = ""; financial.sections.overheads = [];
    const report = calculateHistoricalFinancials(source(), financial, "2026-01-02", "2026-01-02");
    expect(report.totals.totalOperatingCost.status).toBe("partial");
    expect(report.totals.totalOperatingCost.exactValue).not.toBeNull();
    expect(report.totals.operatingProfit.status).toBe("unavailable");
    expect(report.readiness.status).toBe("partial");
  });

  it("uses workbook rates as disclosed estimates and excludes invalid rows", () => {
    const financial = emptyMaster();
    const valid = record({ costs: { part: null, component: 4, machinePerHour: 9, operatorPerHour: 2 } });
    const excluded = record({ id: "excluded", sourceRow: 8, includedInTotals: false });
    const report = calculateHistoricalFinancials(source([valid, excluded]), financial, "2026-01-02", "2026-01-02");
    expect(formatExact(report.totals.materialCost.exactValue, "INR")).toBe("₹400.00");
    expect(report.totals.machineCost.warnings.join(" ")).toMatch(/workbook/i);
    expect(report.readiness.excludedProductionRows).toBe(1);
  });

  it("does not add a consolidated maintenance rate twice", () => {
    const financial = master(); const machine = financial.sections.machines[0];
    machine.values.rateMode = "consolidated"; machine.values.hourlyRate = "9";
    for (const key of ["baseRate", "electricity", "maintenance", "tooling"]) machine.values[key] = "";
    const report = calculateHistoricalFinancials(source(), financial, "2026-01-02", "2026-01-02");
    expect(report.totals.maintenanceCost.status).toBe("unavailable");
    expect(report.totals.maintenanceCost.warnings.join(" ")).toMatch(/included/i);
    expect(report.totals.operatingProfit.status).toBe("available");
    expect(formatExact(report.totals.operatingProfit.exactValue, "INR")).toBe("₹314.00");
  });

  it("formats large and negative INR values without converting exact results to floating point", () => {
    expect(formatExact(exact("12345678901234567890.125").toJSON(), "INR")).toBe("₹1,23,45,67,89,01,23,45,67,890.13");
    expect(formatExact(exact("-1234.5").toJSON(), "INR")).toBe("-₹1,234.50");
  });
});

const realSamplePath = process.env.MMS_SAMPLE_PATH;
describe.skipIf(!realSamplePath)("historical engine with verified MMS sample", () => {
  it("produces disclosed Excel-only subtotals without inventing profit", () => {
    const bytes = readFileSync(realSamplePath!);
    const imported = parseMmsWorkbookFile({ buffer: new Uint8Array(bytes).buffer, fileName: "Sample1_31-07-23_To_25-12-24.xls", mimeType: "application/vnd.ms-excel" });
    const report = calculateHistoricalFinancials(imported, emptyMaster(), "2023-07-31", "2024-12-25", "2026-01-03T00:00:00.000Z");
    expect(report.readiness.usableProductionRows).toBeGreaterThan(13_000);
    expect(report.totals.materialCost.exactValue).not.toBeNull();
    expect(report.totals.machineCost.exactValue).not.toBeNull();
    expect(report.totals.operatingProfit.status).toBe("unavailable");
    expect(report.totals.productionValue.missing.join(" ")).toMatch(/price|mapping/i);
  }, 30_000);
});
