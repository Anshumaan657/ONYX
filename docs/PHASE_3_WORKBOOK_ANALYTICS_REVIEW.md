# Phase 3 — Workbook KPI and breakdown analytics

Phase 3 adds operational comparisons without changing the approved financial formulas.

## Delivered

- Rejection, rework, error-stroke and utilization KPIs
- Target achievement when shift targets are present
- Breakdown tables by machine, product, shift and operator
- Downtime breakdown by reason
- Compact, closed-by-default breakdown details to keep the dashboard readable
- Existing machine, shift and product filters apply to the KPI and breakdown layer
- Missing source fields remain partial or unavailable

These values are workbook-derived operating signals. They are not accounting profit, causal diagnosis or a replacement for confirmed financial policies.

## Verification

```text
npm run lint
npm run typecheck
npm test
npx next build --webpack
```

The complete suite passes with 303 tests passing and 2 intentionally skipped.
