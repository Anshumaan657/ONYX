# Phase 8 — Unified Filters

Phase 8 adds one shared filter model for the historical and forecast workflows. The user can select a date range plus an optional product, machine or shift. Every historical calculation, explanation, trend and 30-day forecast uses the same selection.

Result-status filtering is available for the displayed cards: complete, partial or unavailable. Changing any filter clears the previous result so stale numbers are not shown. The controls are collapsed by default to keep the dashboard simple, and a single reset action returns to all data.

Filters are applied inside the local worker before financial calculations. No workbook data is uploaded, and unknown values remain unavailable rather than being treated as zero.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test` — 293 passed, 2 optional skipped
- `npm run build`
- `git diff --check`
