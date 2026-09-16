import type { FinancialMaster, MasterRow, SectionKey } from "../financial/schema";
import { activeOn, keyOf, numberValue, validDate } from "../financial/validation";
import type { CanonicalMmsImport, CanonicalProductionRecord } from "../mms";
import { exact, type Exact, type ExactValue } from "../policy/exact";
import { runBoundFormula } from "../policy/formulas";
import { HISTORICAL_METRIC_KEYS, type HistoricalDayResult, type HistoricalFinancialReport, type HistoricalMetric, type HistoricalMetricKey, type MetricStatus, type HistoricalFilters } from "./types";

const ZERO = exact("0");
const formula = (policyId: string, values: Record<string, Exact>) => runBoundFormula(policyId, "1.0.0", values).value;
const labels: Record<HistoricalMetricKey, string> = {
  productionValue: "Estimated Production Value",
  materialCost: "Material Cost",
  machineCost: "Machine Cost",
  labourCost: "Labour Cost",
  maintenanceCost: "Maintenance Cost",
  qualityCost: "Quality & Rework Cost",
  allocatedOverhead: "Allocated Overhead",
  otherDirectCost: "Packaging & Transport",
  totalOperatingCost: "Total Operating Cost",
  operatingProfit: "Estimated Operating Profit",
  profitMargin: "Profit Margin",
};
const formulas: Record<HistoricalMetricKey, string> = {
  productionValue: "Good quantity × net selling price",
  materialCost: "Reported quantity × material cost per unit",
  machineCost: "Operating hours × eligible machine rate",
  labourCost: "Eligible paid time or shifts × labour rate",
  maintenanceCost: "Operating hours × separate maintenance rate",
  qualityCost: "Rework quantity × incremental rework cost",
  allocatedOverhead: "Period cost × selected-period share",
  otherDirectCost: "Good quantity × packaging and transport cost per unit",
  totalOperatingCost: "Material + machine + labour + maintenance + quality + overhead + other direct costs",
  operatingProfit: "Estimated Production Value − Total Operating Cost",
  profitMargin: "Estimated Operating Profit ÷ Estimated Production Value × 100",
};

type Accumulator = {
  value: Exact;
  hasValue: boolean;
  missing: Set<string>;
  warnings: Set<string>;
  evidence: Set<string>;
};
type DayState = Record<HistoricalMetricKey, Accumulator>;

function accumulator(): Accumulator { return { value: ZERO, hasValue: false, missing: new Set(), warnings: new Set(), evidence: new Set() }; }
function dayState(): DayState { return Object.fromEntries(HISTORICAL_METRIC_KEYS.map(key => [key, accumulator()])) as DayState; }
function plain(value: number): string {
  if (!Number.isFinite(value)) throw new Error("Non-finite source number.");
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 });
}
function add(target: Accumulator, value: Exact, evidence?: string, warning?: string) {
  target.value = target.value.add(value); target.hasValue = true;
  if (evidence) target.evidence.add(evidence);
  if (warning) target.warnings.add(warning);
}
function miss(target: Accumulator, message: string) { target.missing.add(message); }
function dates(from: string, through: string): string[] {
  if (!validDate(from) || !validDate(through) || from > through) throw new Error("Choose a valid analysis date range.");
  const result: string[] = [];
  for (let cursor = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${through}T00:00:00Z`); cursor <= end; cursor += 86_400_000) {
    if (result.length >= 3660) throw new Error("Historical analysis is limited to 10 years per run.");
    result.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return result;
}
function evidence(row: CanonicalProductionRecord): string { return `${row.sourceSheet} row ${row.sourceRow}`; }
function statusOf(row?: MasterRow): "confirmed" | "estimated" | "provisional" {
  return row?.values.status === "confirmed" ? "confirmed" : row?.values.status === "estimated" ? "estimated" : "provisional";
}
function warningFor(row?: MasterRow): string | undefined {
  const status = statusOf(row); return status === "confirmed" ? undefined : `${status[0].toUpperCase()}${status.slice(1)} financial input used.`;
}

function activeRows(master: FinancialMaster, section: SectionKey, field: string, source: string, date: string): MasterRow[] {
  const wanted = keyOf(source);
  const direct = master.sections[section].filter(row => keyOf(row.values[field]) === wanted && activeOn(row, date));
  if (direct.length) return direct;
  const entity = section === "products" ? "product" : section === "machines" ? "machine" : section === "labour" ? "labour" : null;
  if (!entity) return [];
  const targets = master.sections.aliases
    .filter(row => row.values.entity === entity && keyOf(row.values.source) === wanted && row.values.status === "confirmed" && activeOn(row, date))
    .map(row => row.values.target);
  return master.sections[section].filter(row => targets.some(target => keyOf(row.values[field]) === keyOf(target)) && activeOn(row, date));
}
function productSources(row: CanonicalProductionRecord): string[] {
  return [row.product.partNumber, row.product.productName, row.product.partName, row.product.erpCode, row.product.partErpCode].filter(Boolean);
}
function resolveUnique(master: FinancialMaster, section: "products" | "machines" | "labour", field: string, sources: string[], date: string): MasterRow | null {
  const matches = new Map<string, MasterRow>();
  for (const source of sources) for (const row of activeRows(master, section, field, source, date)) matches.set(row.id, row);
  return matches.size === 1 ? [...matches.values()][0] : null;
}
function value(row: MasterRow | null, key: string): Exact | null {
  const raw = row?.values[key]?.trim(); return raw && numberValue(raw) !== null ? exact(raw) : null;
}
function convertedQuantity(master: FinancialMaster, product: MasterRow, quantity: Exact, date: string): { quantity: Exact; unit: string } | null {
  const from = product.values.sourceUnit.trim().toLowerCase(), to = product.values.unit.trim().toLowerCase();
  if (!from || !to) return null;
  if (keyOf(from) === keyOf(to)) return { quantity, unit: to };
  const rows = master.sections.conversions.filter(row => keyOf(row.values.productId) === keyOf(product.values.productId) && keyOf(row.values.fromUnit) === keyOf(from) && keyOf(row.values.toUnit) === keyOf(to) && row.values.status === "confirmed" && activeOn(row, date));
  if (rows.length !== 1) return null;
  const factor = value(rows[0], "factor"); return factor ? { quantity: quantity.mul(factor), unit: to } : null;
}
function daysInMonth(date: string): number { const [year, month] = date.split("-").map(Number); return new Date(Date.UTC(year, month, 0)).getUTCDate(); }

function metric(key: HistoricalMetricKey, state: Accumulator, forcedStatus?: MetricStatus, explanation?: string): HistoricalMetric {
  const status = forcedStatus ?? (state.hasValue ? state.missing.size ? "partial" : "available" : "unavailable");
  return { key, label: labels[key], status, exactValue: state.hasValue ? state.value.toJSON() : null, unit: key === "profitMargin" ? "percent" : "INR", formula: formulas[key], formulaVersion: "1.0.0", explanation: explanation ?? (status === "available" ? `${labels[key]} was calculated from the eligible records and rates for this period.` : status === "partial" ? `A known subtotal is shown, but ${labels[key].toLowerCase()} is incomplete because some required information is missing.` : `${labels[key]} is unavailable because required information is missing.`), missing: [...state.missing].slice(0, 20), warnings: [...state.warnings].slice(0, 20), evidenceRefs: [...state.evidence].slice(0, 100) };
}

function calculateDay(master: FinancialMaster, records: CanonicalProductionRecord[], date: string): HistoricalDayResult {
  const state = dayState();
  const shiftLabour = new Set<string>();
  const shiftOvertime = new Map<string, { seconds: number; row: MasterRow; ref: string }>();
  for (const record of records) {
    const ref = evidence(record);
    const reportedNumber = record.quantities.reported;
    if (reportedNumber === null) { for (const key of ["productionValue", "materialCost", "otherDirectCost"] as const) miss(state[key], `${ref}: reported quantity is missing.`); continue; }
    const reported = exact(plain(reportedNumber));
    const rejected = record.quantities.rejected === null ? null : exact(plain(record.quantities.rejected));
    const rework = record.quantities.reworked === null ? null : exact(plain(record.quantities.reworked));
    const good = rejected && rework ? formula("good-quantity", { reported, rejected, rework }) : null;
    const product = resolveUnique(master, "products", "productId", productSources(record), date);
    const converted = product ? convertedQuantity(master, product, reported, date) : null;
    const convertedGood = product && good ? convertedQuantity(master, product, good, date) : null;
    if (product && convertedGood) {
      const selling = value(product, "sellingPrice"), discount = value(product, "discountPercent");
      if (selling && discount) {
        const netPrice = formula("net-selling-price", { selling_price: selling, discount_percent: discount });
        add(state.productionValue, formula("production-value", { good_quantity: convertedGood.quantity, net_price: netPrice }), ref, warningFor(product));
      }
      else miss(state.productionValue, `${ref}: selling price or explicit discount is missing for ${product.values.productId}.`);
      const packaging = value(product, "packagingCost"), transport = value(product, "transportCost");
      if (packaging && transport) add(state.otherDirectCost, convertedGood.quantity.mul(packaging.add(transport)), ref, warningFor(product));
      else miss(state.otherDirectCost, `${ref}: packaging or transport cost is missing; enter an explicit zero when it does not apply.`);
    } else {
      miss(state.productionValue, `${ref}: product price or unit mapping is unavailable.`);
      miss(state.otherDirectCost, `${ref}: product cost or unit mapping is unavailable.`);
    }
    if (product && converted) {
      const material = value(product, "materialCost");
      if (material) add(state.materialCost, formula("material-cost", { reported: converted.quantity, material_per_unit: material }), ref, warningFor(product));
      else if (record.costs.component !== null && record.costs.component >= 0) add(state.materialCost, formula("material-cost", { reported, material_per_unit: exact(plain(record.costs.component)) }), ref, "Workbook Component Cost used as an estimated material-rate fallback; confirm its business meaning.");
      else miss(state.materialCost, `${ref}: material cost is missing.`);
    } else if (record.costs.component !== null && record.costs.component >= 0) add(state.materialCost, formula("material-cost", { reported, material_per_unit: exact(plain(record.costs.component)) }), ref, "Workbook Component Cost used as an estimated material-rate fallback; confirm its business meaning.");
    else miss(state.materialCost, `${ref}: product mapping and material cost are missing.`);

    const running = record.timesSeconds.operative;
    const machine = resolveUnique(master, "machines", "machineId", [record.machine], date);
    if (running === null) {
      miss(state.machineCost, `${ref}: operating time is missing.`); miss(state.maintenanceCost, `${ref}: operating time is missing.`);
    } else if (machine?.values.rateMode === "itemized") {
      const base = value(machine, "baseRate"), electricity = value(machine, "electricity"), maintenance = value(machine, "maintenance"), tooling = value(machine, "tooling");
      if (base && electricity && maintenance && tooling) {
        const runningSeconds = exact(plain(running));
        const total = formula("machine-cost-itemized", { running_seconds: runningSeconds, base, electricity, maintenance, tooling });
        const maintenanceAmount = formula("machine-cost-consolidated", { running_seconds: runningSeconds, hourly_rate: maintenance });
        add(state.machineCost, total.sub(maintenanceAmount), ref, warningFor(machine));
        add(state.maintenanceCost, maintenanceAmount, ref, warningFor(machine));
      } else {
        miss(state.machineCost, `${ref}: itemized machine-rate components are incomplete.`);
        miss(state.maintenanceCost, `${ref}: maintenance rate is missing.`);
      }
    } else {
      const rate = machine ? value(machine, "hourlyRate") : record.costs.machinePerHour === null ? null : exact(plain(record.costs.machinePerHour));
      if (rate) add(state.machineCost, formula("machine-cost-consolidated", { running_seconds: exact(plain(running)), hourly_rate: rate }), ref, machine ? warningFor(machine) : "Workbook Running Hrs Cost used as an estimated machine rate.");
      else miss(state.machineCost, `${ref}: machine rate is missing.`);
      if (machine?.values.rateMode === "consolidated") state.maintenanceCost.warnings.add("Maintenance may be included in the consolidated machine rate; a separate amount is unavailable.");
      else miss(state.maintenanceCost, `${ref}: separate maintenance cost is unavailable.`);
    }

    const operatorSources = [record.operator.raw, ...record.operator.names].filter(Boolean);
    const labour = resolveUnique(master, "labour", "groupId", operatorSources, date);
    if (labour?.values.basis === "operator_shift") {
      const rate = value(labour, "rate"), paidHours = value(labour, "paidHours"), key = `${labour.id}|${record.shift}`;
      if (rate && paidHours && !shiftLabour.has(key)) { const paidSeconds = paidHours.mul(exact("3600")); add(state.labourCost, formula("labour-operator-shift", { paid_seconds: paidSeconds, standard_shift_seconds: paidSeconds, shift_rate: rate }), ref, warningFor(labour)); shiftLabour.add(key); }
      else if (!rate || !paidHours) miss(state.labourCost, `${ref}: labour shift rate or paid hours are missing.`);
      const overtime = record.timesSeconds.additionalOvertime ?? 0, previous = shiftOvertime.get(key);
      if (overtime > (previous?.seconds ?? 0)) shiftOvertime.set(key, { seconds: overtime, row: labour, ref });
    } else if (labour && ["operator_hour", "machine_hour"].includes(labour.values.basis)) {
      const rate = value(labour, "rate");
      if (rate && running !== null) {
        const policyId = labour.values.basis === "machine_hour" ? "labour-machine-hour" : "labour-operator-hour";
        add(state.labourCost, formula(policyId, { paid_seconds: exact(plain(running)), hourly_rate: rate }), ref, warningFor(labour));
        const overtime = record.timesSeconds.additionalOvertime ?? 0;
        if (overtime > 0) {
          const multiplier = value(labour, "overtimeMultiplier");
          if (multiplier) add(state.labourCost, formula("overtime-cost", { overtime_seconds: exact(plain(overtime)), base_hourly_rate: rate, multiplier }), ref);
          else miss(state.labourCost, `${ref}: overtime is recorded but its labour multiplier is missing.`);
        }
      }
      else miss(state.labourCost, `${ref}: labour rate or eligible time is missing.`);
    } else if (record.costs.operatorPerHour !== null && running !== null) add(state.labourCost, formula("labour-operator-hour", { paid_seconds: exact(plain(running)), hourly_rate: exact(plain(record.costs.operatorPerHour)) }), ref, "Workbook Operator Per Hrs Cost was applied to operating time as an estimated fallback.");
    else miss(state.labourCost, `${ref}: labour mapping or rate is missing.`);

    const quality = product ? master.sections.quality.filter(row => keyOf(row.values.productId) === keyOf(product.values.productId) && activeOn(row, date)) : [];
    const qualityRow = quality.length === 1 ? quality[0] : null;
    if (rework && product && converted) {
      const convertedRework = convertedQuantity(master, product, rework, date), reworkRate = value(qualityRow, "reworkCost");
      if (convertedRework && reworkRate) add(state.qualityCost, formula("incremental-rework-cost", { rework: convertedRework.quantity, incremental_cost_per_unit: reworkRate }), ref, warningFor(qualityRow ?? undefined));
      else miss(state.qualityCost, `${ref}: rework cost or unit mapping is missing.`);
    } else miss(state.qualityCost, `${ref}: rework quantity or quality-cost mapping is missing.`);
  }

  for (const { seconds, row, ref } of shiftOvertime.values()) {
    if (!seconds) continue;
    const rate = value(row, "rate"), paidHours = value(row, "paidHours"), multiplier = value(row, "overtimeMultiplier");
    if (rate && paidHours && multiplier) add(state.labourCost, formula("overtime-cost", { overtime_seconds: exact(plain(seconds)), base_hourly_rate: rate.div(paidHours), multiplier }), ref);
    else miss(state.labourCost, `${ref}: overtime is recorded but shift hours, rate or multiplier is missing.`);
  }

  for (const row of master.sections.labour.filter(row => row.values.basis === "fixed_period" && activeOn(row, date))) {
    const amount = value(row, "rate");
    if (!amount) { miss(state.labourCost, `Fixed labour ${row.values.groupId || row.id} has no valid rate.`); continue; }
    const divisor = row.values.period === "month" ? daysInMonth(date) : 1;
    add(state.labourCost, formula("period-allocation", { period_cost: amount, share: exact("1").div(exact(String(divisor))) }), `Financial master labour ${row.values.groupId}`, warningFor(row));
  }
  for (const row of master.sections.overheads.filter(row => activeOn(row, date))) {
    const amount = value(row, "amount");
    if (!amount) { miss(state.allocatedOverhead, `Overhead ${row.values.name || row.id} has no valid amount.`); continue; }
    const divisor = row.values.period === "month" ? daysInMonth(date) : 1;
    add(state.allocatedOverhead, formula("period-allocation", { period_cost: amount, share: exact("1").div(exact(String(divisor))) }), `Financial master overhead ${row.values.name}`, warningFor(row));
  }
  if (!master.sections.overheads.some(row => activeOn(row, date))) miss(state.allocatedOverhead, "No overhead covers this date; zero was not assumed.");

  if (!records.length) {
    for (const key of ["productionValue", "materialCost", "machineCost", "labourCost", "maintenanceCost", "qualityCost", "otherDirectCost"] as const) {
      miss(state[key], "No usable production record exists for this date; a missing record was not treated as zero activity.");
    }
  }

  const costKeys: HistoricalMetricKey[] = ["materialCost", "machineCost", "labourCost", "maintenanceCost", "qualityCost", "allocatedOverhead", "otherDirectCost"];
  for (const key of costKeys) {
    if (state[key].hasValue) add(state.totalOperatingCost, state[key].value);
    for (const item of state[key].missing) state.totalOperatingCost.missing.add(item);
    for (const item of state[key].warnings) state.totalOperatingCost.warnings.add(item);
    for (const item of state[key].evidence) state.totalOperatingCost.evidence.add(item);
  }
  if (state.productionValue.hasValue && !state.productionValue.missing.size && state.totalOperatingCost.hasValue && !state.totalOperatingCost.missing.size) {
    add(state.operatingProfit, formula("operating-profit", { production_value: state.productionValue.value, operating_cost: state.totalOperatingCost.value }));
    state.operatingProfit.evidence = new Set([...state.productionValue.evidence, ...state.totalOperatingCost.evidence]);
    if (state.productionValue.value.compare(ZERO) !== 0) add(state.profitMargin, formula("profit-margin", { operating_profit: state.operatingProfit.value, production_value: state.productionValue.value }));
    else miss(state.profitMargin, "Production value is zero, so profit margin is undefined.");
  } else {
    miss(state.operatingProfit, "Complete production value and operating cost are required.");
    miss(state.profitMargin, "Complete operating profit and non-zero production value are required.");
  }
  const metrics = Object.fromEntries(HISTORICAL_METRIC_KEYS.map(key => [key, metric(key, state[key])])) as HistoricalDayResult["metrics"];
  return { date, productionRows: records.length, metrics };
}

function combine(days: HistoricalDayResult[], key: HistoricalMetricKey): HistoricalMetric {
  const source = accumulator();
  for (const day of days) {
    const item = day.metrics[key];
    if (item.exactValue && key !== "profitMargin") add(source, exact(item.exactValue));
    for (const value of item.missing) source.missing.add(value);
    for (const value of item.warnings) source.warnings.add(value);
    for (const value of item.evidenceRefs) source.evidence.add(value);
  }
  if (key === "profitMargin") {
    const profit = combine(days, "operatingProfit"), production = combine(days, "productionValue");
    if (profit.status === "available" && production.status === "available" && profit.exactValue && production.exactValue && exact(production.exactValue).compare(ZERO) !== 0) add(source, formula("profit-margin", { operating_profit: exact(profit.exactValue), production_value: exact(production.exactValue) }));
    else miss(source, "Complete operating profit and non-zero production value are required.");
  }
  return metric(key, source);
}

export function calculateHistoricalFinancials(source: CanonicalMmsImport, master: FinancialMaster, from: string, through: string, generatedAt = new Date().toISOString(), filters: HistoricalFilters = {}): HistoricalFinancialReport {
  const selectedDates = dates(from, through);
  const byDate = new Map(selectedDates.map(date => [date, [] as CanonicalProductionRecord[]]));
  let excluded = 0;
  for (const row of source.productionRecords) {
    if (!row.includedInTotals) { excluded++; continue; }
    const product = row.product.partNumber || row.product.productName || row.product.partName;
    if (filters.product && keyOf(product) !== keyOf(filters.product)) continue;
    if (filters.machine && keyOf(row.machine) !== keyOf(filters.machine)) continue;
    if (filters.shift && keyOf(row.shift) !== keyOf(filters.shift)) continue;
    if (row.businessDate && byDate.has(row.businessDate)) byDate.get(row.businessDate)!.push(row);
  }
  const days = selectedDates.map(date => calculateDay(master, byDate.get(date)!, date));
  const totals = Object.fromEntries(HISTORICAL_METRIC_KEYS.map(key => [key, combine(days, key)])) as HistoricalFinancialReport["totals"];
  const missing = [...new Set(HISTORICAL_METRIC_KEYS.flatMap(key => totals[key].missing))].slice(0, 100);
  const warnings = [...new Set(["Formula implementations are version 1.0.0; business approval remains separate from data completeness.", ...HISTORICAL_METRIC_KEYS.flatMap(key => totals[key].warnings)])].slice(0, 100);
  const profitStatus = totals.operatingProfit.status;
  return { schemaVersion: 1, engineVersion: "1.0.0", from, through, generatedAt, sourceFile: source.source.fileName, masterRevision: master.revision, days, totals, readiness: { status: profitStatus === "available" ? "ready" : totals.totalOperatingCost.exactValue || totals.productionValue.exactValue ? "partial" : "unavailable", usableProductionRows: days.reduce((sum, day) => sum + day.productionRows, 0), excludedProductionRows: excluded, missing, warnings } };
}

export function formatExact(value: ExactValue | null, unit: "INR" | "percent"): string {
  if (!value) return "Unavailable";
  const rendered = exact(value).format(2);
  const [signedWhole, fraction] = rendered.split("."), negative = signedWhole.startsWith("-");
  const whole = negative ? signedWhole.slice(1) : signedWhole;
  const tail = whole.slice(-3), head = whole.slice(0, -3);
  const groupedHead = head ? head.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "";
  const display = `${negative ? "-" : ""}${groupedHead}${tail}.${fraction}`;
  return unit === "INR" ? `${negative ? "-" : ""}₹${display.replace("-", "")}` : `${display}%`;
}
