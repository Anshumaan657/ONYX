# Phase 4 — Workbook daily trends

Phase 4 adds a date-by-date view to the workbook-only analysis layer.

## Delivered

- Daily reported and accepted production
- Daily rejected and reworked quantities
- Daily downtime hours
- An accessible production trend chart with a tabular fallback
- Date and entity filters applied before trend aggregation
- Missing daily values remain labelled unavailable
- Trends are collapsed by default so the dashboard stays focused

This view describes operational workbook evidence. It does not claim causality, accounting profit or a forecast.

## Verification

```text
npm run lint
npm run typecheck
npm test
npx next build --webpack
```
