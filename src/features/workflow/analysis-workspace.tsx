"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MmsImportSummary } from "@/core/mms";
import { MmsImporter } from "@/features/importer/mms-importer";
import { FinancialSetupWizard } from "@/features/financial-setup/financial-setup-wizard";
import { PolicyWorkspace } from "@/features/policies/policy-workspace";
import { emptyMaster, type FinancialMaster } from "@/core/financial/schema";
import type { FinancialRelease } from "@/core/policy/releases";
import { emptyArchive, mergeArchives, type PolicyArchive } from "@/core/policy/portability";
import { ArchiveControls } from "@/features/policies/archive-controls";
import type { HistoricalAnalysisClient } from "@/core/historical";
import { FinancialResults } from "@/features/results/financial-results";
import { DataReview } from "@/features/review/data-review";

export function AnalysisWorkspace() {
  const [step, setStep] = useState<"import" | "review" | "setup" | "results" | "policies">("import");
  const [master, setMaster] = useState(emptyMaster);
  const [archive, setArchive] = useState<PolicyArchive>(emptyArchive);
  const currentArchive = useRef(archive);
  const [setupSeed, setSetupSeed] = useState<FinancialMaster | undefined>(undefined);
  const [setupGeneration, setSetupGeneration] = useState(0);
  function commitArchive(next: PolicyArchive) {
    const current = currentArchive.current;
    if (current.releases.some((release, index) => next.releases[index]?.hash !== release.hash || next.releases[index]?.id !== release.id) || current.runs.some(run => !next.runs.some(nextRun => nextRun.id === run.id && nextRun.hash === run.hash))) throw new Error("The archive changed during this operation. Retry without replacing newer history.");
    currentArchive.current = next; setArchive(next);
  }
  function setHistory(history: readonly FinancialRelease[]) { commitArchive({ ...currentArchive.current, releases: history }); }
  async function mergeArchive(incoming: PolicyArchive) {
    const previous = currentArchive.current; const merged = await mergeArchives(previous, incoming);
    if (previous !== currentArchive.current) throw new Error("Archive changed while validating. Please retry the merge.");
    commitArchive(merged);
  }
  function restoreMaster(value: FinancialMaster) { setSetupSeed(value); setMaster(value); setSetupGeneration(current => current + 1); }
  const [source, setSource] = useState<MmsImportSummary | null>(null);
  const [analysisClient, setAnalysisClient] = useState<HistoricalAnalysisClient | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = window.localStorage.getItem("onyx-theme");
    const next = saved === "dark" || saved === "light"
      ? saved
      : typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    queueMicrotask(() => setTheme(next));
    document.documentElement.dataset.theme = next;
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("onyx-theme", next);
  }
  function imported(summary: MmsImportSummary, client: HistoricalAnalysisClient) { setSource(summary); setAnalysisClient(client); setStep("review"); }
  function resetSource() { setSource(null); setAnalysisClient(null); setStep("import"); }
  return <main className="app-shell mx-auto min-h-screen w-full max-w-[1440px] px-[clamp(24px,4vw,64px)] py-5">
    <header className="app-header flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="brand-home" aria-label="Onyx home"><span className="brand-wordmark">ONYX</span><span className="brand-subtitle">Local-first financial workspace</span></Link>
      <div className="header-actions"><span className="privacy-note">Private on your device · No cloud upload</span><button className="theme-toggle" type="button" role="switch" aria-checked={theme === "dark"} aria-label="Toggle dark mode" onClick={toggleTheme}><span className="theme-toggle-track" aria-hidden="true"><span className="theme-toggle-thumb" /></span><span className="theme-toggle-label">{theme === "dark" ? "Dark" : "Light"}</span></button></div>
    </header>
    <nav className="workflow-nav my-6 flex flex-wrap gap-2" aria-label="Analysis workflow">
      <button className={step === "import" ? "workflow-step active" : "workflow-step"} aria-current={step === "import" ? "step" : undefined} onClick={() => setStep("import")}>1 · Import data{source ? " ✓" : ""}</button>
      <button className={step === "review" ? "workflow-step active" : "workflow-step"} aria-current={step === "review" ? "step" : undefined} disabled={!source} onClick={() => setStep("review")}>2 · Data review</button>
      <button className={step === "setup" ? "workflow-step active" : "workflow-step"} aria-label="Financial setup" aria-current={step === "setup" ? "step" : undefined} onClick={() => setStep("setup")}>3 · Financial setup</button>
      <button className={step === "results" ? "workflow-step active" : "workflow-step"} aria-current={step === "results" ? "step" : undefined} disabled={!source} onClick={() => setStep("results")}>4 · Financial results</button>
      <button className="workflow-step ml-auto" aria-current={step === "policies" ? "page" : undefined} onClick={() => setStep("policies")}>Policies & history</button>
    </nav>
    <div hidden={step !== "import"}>
      <div className="mb-5"><h1 className="text-3xl font-bold tracking-tight">Start with your MMS workbook.</h1><p className="mt-2 text-sm text-[var(--muted)]">Validation and processing are automatic. Review exceptions, then complete the missing financial inputs.</p></div>
      <MmsImporter onReady={imported} onReset={resetSource} onContinue={() => setStep("review")} />
      <p className="setup-help mt-4">Reported Qty is authoritative. Stroke × multiplier is a validation check, never a replacement.</p>
    </div>
    <div hidden={step !== "review"}><DataReview source={source} master={master} onSetup={() => setStep("setup")} onResults={() => setStep("results")} /></div>
    <div hidden={step !== "setup"}><FinancialSetupWizard key={setupGeneration} source={source} onMasterChange={setMaster} initialMaster={setupSeed} /></div>
    <div hidden={step !== "results"}><FinancialResults key={`${source?.source.importedAt ?? "none"}:${master.revision}`} source={source} master={master} client={analysisClient} onSetup={() => setStep("setup")} /></div>
    <div hidden={step !== "policies"}><PolicyWorkspace master={master} history={archive.releases} onHistory={setHistory} portability={<ArchiveControls archive={archive} onMerge={mergeArchive} onRestoreMaster={restoreMaster} />} /></div>
    <footer className="app-footer mt-12 py-5 text-xs text-[var(--muted)]">© 2026 Data Dribblers. ONYX is a product of Data Dribblers.</footer>
  </main>;
}
