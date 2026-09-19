"use client";

import { useMemo } from "react";
import { validateMaster, type SetupIssue } from "@/core/financial/validation";
import type { FinancialMaster } from "@/core/financial/schema";
import type { MmsImportSummary } from "@/core/mms";

type Props = {
  source: MmsImportSummary | null;
  master: FinancialMaster;
  onSetup: () => void;
  onResults: () => void;
};

function issueLabel(issue: SetupIssue): string {
  return issue.message.replace(/\.$/, "");
}

export function DataReview({ source, master, onSetup, onResults }: Props) {
  const issues = useMemo(() => validateMaster(master, source?.catalog), [master, source]);
  const blocking = issues.filter(issue => issue.level === "error" || issue.level === "missing");
  const warnings = issues.filter(issue => issue.level === "warning");
  const hasWorkbookIssues = Boolean(source?.compatibility.issues.some(issue => issue.severity !== "info"));
  const reviewNeeded = blocking.length > 0 || warnings.length > 0 || hasWorkbookIssues;

  if (!source) {
    return <section className="setup-card" aria-labelledby="review-title"><h1 id="review-title" className="text-2xl font-bold">Data review</h1><p className="mt-2 text-sm text-(--muted)">Upload a workbook first. We will automatically check it and show only items that need attention.</p></section>;
  }

  return <section aria-labelledby="review-title">
    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-(--brand)">Step 2 · Automatic review</p><h1 id="review-title" className="mt-2 text-3xl font-bold tracking-tight">Your workbook is processed.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-(--muted)">We checked the file locally. Review is only needed for missing, unclear or conflicting financial information.</p></div>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
      <div className="setup-card"><p className="text-sm font-semibold text-(--muted)">Workbook</p><p className="mt-2 text-lg font-bold">Ready</p><p className="setup-help">{source.productionRecordCount.toLocaleString("en-IN")} production records read</p></div>
      <div className="setup-card"><p className="text-sm font-semibold text-(--muted)">Data quality</p><p className="mt-2 text-lg font-bold">{source.totalDataIssueCount ? `${source.totalDataIssueCount.toLocaleString("en-IN")} findings` : "No findings"}</p><p className="setup-help">Invalid rows remain excluded and traceable</p></div>
      <div className="setup-card"><p className="text-sm font-semibold text-(--muted)">Financial setup</p><p className="mt-2 text-lg font-bold">{blocking.length ? "Needs review" : "Ready"}</p><p className="setup-help">Unknown values are never treated as zero</p></div>
    </div>

    {reviewNeeded ? <div className="tone-panel partial mt-5 p-5" role="status">
      <h2 className="font-bold">{blocking.length + warnings.length + (hasWorkbookIssues ? 1 : 0)} items may affect your results</h2>
      <p className="mt-2 text-sm leading-6 text-(--muted)">You can review them now, or continue. A skipped item will be labelled Partial or Unavailable in the summary.</p>
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        <div className="tone-panel p-4"><p className="text-sm font-bold">Needs attention</p><ul className="mt-2 space-y-2 text-sm text-(--muted)">{blocking.slice(0, 5).map((issue, index) => <li key={`${issue.section}-${issue.rowId ?? index}`}>— {issueLabel(issue)}</li>)}{hasWorkbookIssues && <li>— Workbook compatibility has warnings to review</li>}</ul>{blocking.length > 5 && <p className="setup-help">And {blocking.length - 5} more items</p>}</div>
        <div className="tone-panel p-4"><p className="text-sm font-bold">Optional improvements</p><ul className="mt-2 space-y-2 text-sm text-(--muted)">{warnings.slice(0, 5).map((issue, index) => <li key={`${issue.section}-${issue.rowId ?? index}`}>— {issueLabel(issue)}</li>)}{!warnings.length && <li>— No optional improvements detected</li>}</ul></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3"><button className="setup-button" type="button" onClick={onSetup}>Review and fix items</button><button className="setup-secondary" type="button" onClick={onResults}>Continue with available results</button></div>
    </div> : <div className="tone-panel complete mt-5 p-5"><h2 className="font-bold">Nothing needs your attention</h2><p className="mt-2 text-sm text-(--muted)">The workbook is ready. Choose a date or date range to view the financial summary.</p><button className="setup-button mt-4" type="button" onClick={onResults}>Choose dates and view results</button></div>}
    <p className="setup-help mt-5">Source: {source.source.fileName} · Coverage: {source.dateRange?.join(" to ") ?? "not available"} · All processing stays on this device.</p>
  </section>;
}
