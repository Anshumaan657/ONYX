# Phase 7 — Profit Opportunities

Phase 7 adds an optional improvement panel to the historical results view. It uses the calculated financial metrics for the selected date or date range, ranks the largest controllable cost areas, and gives a short action the factory team can consider.

The panel is closed by default so the summary remains calm and readable. It does not invent savings, guarantee an outcome or replace operational investigation. When profit is unavailable, recommendations are withheld until the required financial inputs are complete.

## Current scope

- Profit, loss and break-even states
- Exact ranking of available cost drivers
- Short plain-English improvement actions
- Driver values formatted in INR
- Clear distinction between financial opportunity and accounting result

Product-level, machine-level and downtime-specific opportunity sizing will build on the unified filters and loss-attribution evidence in later phases.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test` — 290 passed, 2 optional skipped
- `npm run build`
- `git diff --check`
