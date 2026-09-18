import { describe, expect, it } from "vitest";
import { emptyMaster } from "../financial/schema";
import { validateForecast } from "./validation";
import type { CanonicalMmsImport } from "../mms";

const source = {} as CanonicalMmsImport;

describe("forecast validation", () => {
  it("withholds a backtest when the selected history is shorter than 60 days", () => {
    const result = validateForecast(source, emptyMaster(), "2026-01-01", "2026-01-31");
    expect(result.confidence).toBe("unavailable");
    expect(result.passed).toBe(false);
    expect(result.explanation).toMatch(/60 calendar days/);
  });
});
