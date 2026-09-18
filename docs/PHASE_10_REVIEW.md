# Phase 10 — Reports and Exports

Phase 10 adds an optional Reports & exports panel below the financial and forecast views. It is collapsed by default so the owner dashboard remains focused.

Available exports:

- Historical daily metrics as CSV
- Forecast daily metrics as CSV, when a forecast has been generated
- A JSON report bundle containing historical results, optional forecast results, statuses, assumptions and evidence
- A print-friendly report

Exports use the currently selected dates and product, machine and shift filters. Unknown values remain blank and retain their unavailable status; the export does not convert them to zero. Files are generated locally in the browser.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test` — 296 passed, 2 optional skipped
- `npm run build`
- `git diff --check`
