"use client";

import { useMemo, useState } from "react";
import { formatExact, type HistoricalAnalysisClient, type HistoricalFinancialReport, type HistoricalMetric, type HistoricalMetricKey } from "@/core/historical";
import type { FinancialMaster } from "@/core/financial/schema";
import type { MmsImportSummary } from "@/core/mms";
import { exact } from "@/core/policy/exact";

const primary: HistoricalMetricKey[] = ["productionValue", "totalOperatingCost", "operatingProfit", "profitMargin"];
const costs: HistoricalMetricKey[] = ["materialCost", "machineCost", "labourCost", "maintenanceCost", "qualityCost", "allocatedOverhead", "otherDirectCost"];

function statusLabel(metric: HistoricalMetric): string {
  if (metric.status === "available") return "Complete";
  if (metric.status === "partial") return "Partial — known subtotal";
  return "Unavailable";
}

function Trend({ report, metricKey }: { report: HistoricalFinancialReport; metricKey: HistoricalMetricKey }) {
  const points = report.days.flatMap(day => {
    const value = day.metrics[metricKey].exactValue;
    return value ? [{ date: day.date, value: Number(exact(value).format(8)) }] : [];
  });
  if (points.length < 2) return <p className="setup-help mt-4">Choose a range with at least two available daily values to see a trend.</p>;
  const values = points.map(point => point.value), min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const path = points.map((point, index) => `${index ? "L" : "M"} ${10 + index * (280 / Math.max(1, points.length - 1))} ${90 - ((point.value - min) / span) * 70}`).join(" ");
  return <div className="mt-5">
    <svg className="h-32 w-full overflow-visible" viewBox="0 0 300 110" role="img" aria-label={`${report.totals[metricKey].label} daily trend from ${report.from} to ${report.through}`}>
      <line x1="10" x2="290" y1="90" y2="90" stroke="var(--line)" />
      <path d={path} fill="none" stroke="var(--brand)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      {points.map((point, index) => <circle key={point.date} cx={10 + index * (280 / Math.max(1, points.length - 1))} cy={90 - ((point.value - min) / span) * 70} r="2.5" fill="var(--surface)" stroke="var(--brand)" strokeWidth="2"><title>{point.date}: {formatExact(report.days.find(day => day.date === point.date)!.metrics[metricKey].exactValue, report.totals[metricKey].unit)}</title></circle>)}
    </svg>
    <div className="flex justify-between text-xs text-[var(--muted)]"><span>{points[0].date}</span><span>{points.at(-1)!.date}</span></div>
    <details className="mt-3 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold">View daily values</summary><div className="max-h-64 overflow-auto rounded-xl border border-[var(--line)]"><table className="w-full border-collapse"><thead><tr><th className="p-3 text-left">Date</th><th className="p-3 text-right">Value</th></tr></thead><tbody>{report.days.map(day => <tr className="border-t border-[var(--line)]" key={day.date}><td className="p-3">{day.date}</td><td className="p-3 text-right">{formatExact(day.metrics[metricKey].exactValue, day.metrics[metricKey].unit)}</td></tr>)}</tbody></table></div></details>
  </div>;
}

function MetricCard({ metric, metricKey, report }: { metric: HistoricalMetric; metricKey: HistoricalMetricKey; report: HistoricalFinancialReport }) {
  const [open, setOpen] = useState(false);
  const amount = formatExact(metric.exactValue, metric.unit);
  return <article className={`result-card ${metric.status}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--muted)]">{metric.label}</p><p className="mt-2 text-2xl font-black tracking-[-0.04em]">{metric.status === "partial" ? `${amount} known` : amount}</p></div><span className="result-status">{statusLabel(metric)}</span></div>
    <button type="button" aria-expanded={open} className="setup-secondary mt-5 w-full" onClick={() => setOpen(value => !value)}>{open ? "Hide details" : "View details"}</button>
    {open ? <div className="mt-5 border-t border-[var(--line)] pt-5">
      <h3 className="text-sm font-bold">Why this result?</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{metric.explanation}</p>
      <h3 className="mt-5 text-sm font-bold">Calculation</h3><p className="mt-2 rounded-xl bg-[var(--canvas)] p-3 text-sm">{metric.formula} · Version {metric.formulaVersion}</p>
      {metric.missing.length ? <><h3 className="mt-5 text-sm font-bold">What is missing?</h3><ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">{metric.missing.slice(0, 5).map(item => <li key={item}>— {item}</li>)}</ul>{metric.missing.length > 5 ? <p className="setup-help">And {metric.missing.length - 5} more missing items.</p> : null}</> : null}
      {metric.warnings.length ? <><h3 className="mt-5 text-sm font-bold">Important notes</h3><ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">{metric.warnings.slice(0, 5).map(item => <li key={item}>— {item}</li>)}</ul></> : null}
      {metric.evidenceRefs.length ? <details className="mt-4 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold">View source evidence</summary><p className="setup-help">{metric.evidenceRefs.slice(0, 12).join(" · ")}{metric.evidenceRefs.length > 12 ? ` · and ${metric.evidenceRefs.length - 12} more` : ""}</p></details> : null}
      <Trend report={report} metricKey={metricKey} />
    </div> : null}
  </article>;
}

export function FinancialResults({ source, master, client, onSetup }: { source: MmsImportSummary | null; master: FinancialMaster; client: HistoricalAnalysisClient | null; onSetup: () => void }) {
  const available = source?.dateRange;
  const [from, setFrom] = useState(available?.[0] ?? "");
  const [through, setThrough] = useState(available?.[1] ?? "");
  const [report, setReport] = useState<HistoricalFinancialReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rangeInvalid = !available || !from || !through || from > through || (available ? from < available[0] || through > available[1] : true);
  async function run() {
    if (!client || rangeInvalid) return;
    setBusy(true); setError("");
    try { setReport(await client.analyze({ master, from, through })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Financial analysis could not be completed."); }
    finally { setBusy(false); }
  }
  const period = useMemo(() => from && through ? from === through ? from : `${from} to ${through}` : "", [from, through]);
  if (!source || !client || !available) return <section className="setup-card"><h1 className="text-2xl font-bold">Financial results</h1><p className="mt-2 text-sm text-[var(--muted)]">Import an MMS workbook with valid dates before choosing a period.</p></section>;
  const coverage = available;
  return <section aria-labelledby="results-title">
    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand)]">Historical financial performance</p><h1 id="results-title" className="mt-2 text-3xl font-bold tracking-tight">Choose dates. See the financial picture.</h1><p className="mt-2 text-sm text-[var(--muted)]">Results are estimated operational figures, not invoiced revenue or accounting profit. Details stay closed until you request them.</p></div>
    <div className="setup-card"><div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="setup-label">From<input type="date" className="setup-input" min={coverage[0]} max={coverage[1]} value={from} onInput={event => setFrom(event.currentTarget.value)} /></label><label className="setup-label">Through<input type="date" className="setup-input" min={from || coverage[0]} max={coverage[1]} value={through} onInput={event => setThrough(event.currentTarget.value)} /></label><button type="button" className="setup-button" disabled={busy || rangeInvalid} onClick={() => void run()}>{busy ? "Calculating…" : "Calculate results"}</button></div><p className="setup-help">Workbook coverage: {coverage[0]} to {coverage[1]}.</p>{rangeInvalid ? <p className="setup-findings mt-3">Choose dates inside the workbook coverage.</p> : null}{error ? <p role="alert" className="setup-findings mt-3">{error}</p> : null}</div>
    {!report ? <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] p-8 text-center"><p className="font-semibold">Your financial summary will appear here.</p><p className="setup-help">Unknown prices and costs will remain unavailable, never zero.</p></div> : <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Financial overview</h2><p className="setup-help">{period} · {report.readiness.usableProductionRows.toLocaleString("en-IN")} usable production records</p></div><span className={`readiness ${report.readiness.status}`}>{report.readiness.status === "ready" ? "Complete calculation" : report.readiness.status === "partial" ? "Partial calculation" : "Financial inputs required"}</span></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{primary.map(key => <MetricCard key={key} metricKey={key} metric={report.totals[key]} report={report} />)}</div>
      <h2 className="mt-8 text-xl font-bold">Cost breakdown</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{costs.map(key => <MetricCard key={key} metricKey={key} metric={report.totals[key]} report={report} />)}</div>
      {report.readiness.missing.length ? <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-5"><h2 className="font-bold">Complete the missing financial information</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">A known subtotal may be shown, but complete profit stays unavailable until required prices and costs are supplied.</p><button type="button" className="setup-secondary mt-4" onClick={onSetup}>Review financial setup</button></div> : null}
    </>}
  </section>;
}
